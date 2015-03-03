/* See license.txt for terms of usage */

const { interfaces: Ci, classes: Cc, results: Cr, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import('resource://chaika-modules/ChaikaRedirector.js');
Cu.import('resource://chaika-modules/ChaikaURLUtil.js');


/**
 * Frame Script
 */
var ChaikaBrowserContent = {

    init: function(){
        addMessageListener('chaika-skin-changed', this.handleMessage.bind(this));
        addMessageListener('chaika-post-finished', this.handleMessage.bind(this));
        addMessageListener('chaika-abone-add', this.handleMessage.bind(this));
        addMessageListener('chaika-abone-remove', this.handleMessage.bind(this));

        // We should initialize ChaikaRedirector in the content process
        // to allow nsIContentPolicy handle http requests made in the content.
        if(Services.prefs.getBoolPref("extensions.chaika.browser.redirector.enabled")){
            ChaikaRedirector.init();
        }
    },


    handleMessage: function(message){
        if(!message.name.startsWith('chaika-')) return;
        if(!ChaikaURLUtil.isChaikafied(content.location.href)) return;


        switch(message.name){
            case 'chaika-skin-changed':
                if(ChaikaURLUtil.isThread(content.location.href)){
                    content.location.reload();
                }
                break;

            case 'chaika-post-finished':
                let postedThreadURL = new content.URL(message.data.url);

                if(content.location.pathname.contains(postedThreadURL.pathname)){
                    content.location.reload();
                }
                break;

            case 'chaika-abone-add':
                this.emitEvent(message.name, message.data.type, message.data.data);
                sendAsyncMessage(message.name, message.data);

                let legacyAboneType = ['name', 'mail', 'id', 'word', 'ex'].indexOf(message.data.type);
                if(legacyAboneType === 4) legacyAboneType = 99;

                this.emitEvent('b2raboneadd', legacyAboneType, message.data.data, true);
                break;

            case 'chaika-abone-remove':
                this.emitEvent(message.name, message.data.type, message.data.data);
                sendAsyncMessage(message.name, message.data);
                break;

        }
    },


    /**
     * browserMenu.xml のメソッドを実行し、その結果を同期的に返す
     * @param {String} name メソッド名
     * @param {Any} args メソッドに渡す引数
     */
    executeBrowserMenuCommand: function(name, ...args){
        return sendSyncMessage('chaika-browser-menu-command', {
            name: name,
            args: args
        })[0];
    },


    /**
     * content 領域にイベントを発生させる
     * @param {String} aEventName イベント名
     * @param {String} aSubject 送るデータのタイトル event.sourceEvent.type で参照できる
     * @param {String} aData 送るデータ event.sourceEvent.detail で参照できる
     * @param {Boolean} [isLegacyEvent=false] レガシータイプのイベントを作成するか？
     */
    emitEvent: function(aEventName, aSubject, aData, isLegacyEvent){
        let win = content;
        let doc = content.document;

        if(!isLegacyEvent){
            let sourceEvent = doc.createEvent("CustomEvent");
            sourceEvent.initCustomEvent(aSubject, false, false, aData);

            let event = doc.createEvent('XULCommandEvents');
            event.initCommandEvent(aEventName, true, false, win, null,
                                   false, false, false, false, sourceEvent);

            doc.dispatchEvent(event);
        }else{
            let sourceEvent = doc.createEvent('Events');
            sourceEvent.initEvent(aData, false, false);

            let event = doc.createEvent('XULCommandEvents');
            event.initCommandEvent(aEventName, true, false, win, aSubject,
                                   false, false, false, false, sourceEvent);

            doc.dispatchEvent(event);
        }
    }

};


ChaikaBrowserContent.init();
