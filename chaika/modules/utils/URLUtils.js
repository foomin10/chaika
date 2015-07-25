/* See license.txt for terms of usage */

'use strict';

this.EXPORTED_SYMBOLS = ["URLUtils"];

const { interfaces: Ci, classes: Cc, results: Cr, utils: Cu } = Components;

let { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
let { Range } = Cu.import("resource://chaika-modules/utils/Range.js", {});
let { ChaikaServer } = Cu.import("resource://chaika-modules/ChaikaServer.js", {});


// We are hard-coding these constants for now,
// just until finishing the implementation of Pluggable Board Definition and Pluggable Dat Fetching;
// These will and should be removed on released version.
const BBS_DOMAINS = [
    '2ch.net',
    'bbspink.com',
    'machi.to',
    'jbbs.livedoor.jp',
    'jbbs.shitaraba.net',
    '.2ch.sc',
    '.jikkyo.org',
    'next2ch.net',
    'blogban.net',
    'plusvip.jp',
    'katsu.ula.cc',
    'ex14.vip2ch.com',
];


const EXCLUDE_DOMAINS = [
    "find.2ch.net",
    "info.2ch.net",
    "epg.2ch.net",
    "headline.2ch.net",
    "newsnavi.2ch.net",
    "headline.bbspink.com",
    'developer.2ch.net',
    'api.2ch.net',
    'be.2ch.net',
    'dig.2ch.net',
    'notice.2ch.net',
    'stats.2ch.net',
];


/**
 * URL に対し, chaika が絡む処理をまとめる
 */
let URLUtils = {

    /**
     * The URL of the local server.
     * @type {String}
     * @example http://127.0.0.1:8823/
     */
    get serverURL(){
        return ChaikaServer.serverURL.spec;
    },


    /**
     * Returns true if a URL indicates the page in chaika-view mode.
     * @param {String} aURL
     * @return {Bool}
     */
    isChaikafied: function(aURL){
        return aURL.startsWith('chaika://') || aURL.startsWith(this.serverURL);
    },


    /**
     * Returns true if a URL indicates the page is in BBS service, i.e., a board or a thread.
     * @param {String} aURL
     * @return {Bool}
     */
    isBBS: function(aURL){
        if(this.isChaikafied(aURL)){
            return true;
        }


        let url = Services.io.newURI(aURL, null, null);

        if(!url.scheme || !url.scheme.startsWith('http')){
            return false;
        }

        return BBS_DOMAINS.some((domain) => url.host.contains(domain)) &&
               !EXCLUDE_DOMAINS.some((domain) => url.host.contains(domain));
    },


    /**
     * Returns true if a URL indicates the page is a board.
     * ("Board" is a home page of list of threads about a certain topic.)
     * @param {String} aURL
     * @return {Bool}
     */
    isBoard: function(aURL){
        return this.isBBS(aURL) && !this.isThread(aURL);
    },


    /**
     * Returns true if a URL indicates the page is a thread.
     * @param {String} aURL
     * @return {Bool}
     */
    isThread: function(aURL){
        return aURL.contains('/read.');
    },


    /**
     * Convert a chaika-mode URL to a normal-mode URL.
     * @param {String} aURL
     * @return {String}
     */
    unchaikafy: function(aURL){
        return aURL.replace(this.serverURL + 'thread/', '')
                   .replace(/^chaika:\/\/[a-z]*\/?/, '');
    },


    /**
     * Convert a normal-mode URL to a chaika-mode URL
     * @param {String} aURL
     * @return {String}
     */
    chaikafy: function(aURL){
        if(this.isThread(aURL)){
            return this._chaikafyThread(aURL);
        }else{
            return this._chaikafyBoard(aURL);
        }
    },


    /**
     * @param {String} aURL
     * @return {String}
     */
    _chaikafyBoard: function(aURL){
        return 'chaika://board/' + aURL;
    },


    /**
     * @param {String} aURL
     * @return {String}
     */
    _chaikafyThread: function(aURL){
        return this.serverURL + 'thread/' + aURL;
    }

};



/**
 * Parser for a thread filter string
 * @param {String} aFilterStr String that represents a range of thread to show
 * @param {Number} [unreadPosition] Optional but require if aFilterStr is like 'l30'
 */
function ThreadFilter(aFilterStr, unreadPosition){
    this._range = this.parse(aFilterStr, unreadPosition);
}

ThreadFilter.prototype = {

    // [official]
    // (blank) -> 1-
    // n -> 2-
    // 10 -> 10
    // 3-5 -> 1,3-5
    // 3-5n -> 3-5
    // 10- -> 1,10-
    // 10n- -> 10-
    // -5 -> 1-5
    // -5n -> 1-5
    // l10 -> 1,l10
    // l10n -> l10
    //
    // [non-standard extends]
    // 2,5,10 -> 2,5,10
    // 2+5+10 -> 2,5,10
    // 2,5-7,9 -> 2,5-7,9
    // -3,5 -> 1-3,5
    // 5,10- -> 5,10-

    parse(str, upos) {
        if(str.contains(',') || str.contains('+')){
            return str.split(/,\+/).map((range) => this._parseRange(range, upos));
        }else{
            // A blank filter means a request for all posts from the first.
            if(str === ''){
                return [this._parseRange('1-', upos)];
            }

            // 'n' means a request for all posts except for the first.
            if(str === 'n'){
                return [this._parseRange('2-', upos)];
            }

            // Simple number
            if(/^\d+$/.test(str)){
                return [Number.parseInt(str, 10)];
            }

            if(str.contains('n')){
                return [this._parseRange(str.replace(/n/g, ''))];
            }else{
                let _range = this._parseRange(str, upos);

                if(_range.includes(1)){
                    return [_range];
                }else{
                    return [1, _range];
                }
            }

            throw new Error('Unexpected token: ' + str);
        }
    },


    _parseRange(str, upos) {
        if(str.startsWith('l')){
            let limit = str.replace(/l/g, '') - 0;

            return new Range(upos - limit, upos - 1);
        }

        if(/^\d+$/.test(str)){
            return Number.parseInt(str, 10);
        }


        let [begin, end] = str.split('-');

        return new Range(begin || undefined, end || undefined);
    }

};
