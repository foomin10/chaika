//コレ参照してるコードが他にないような気がする
Components.utils.import("resource://chaika-modules/ChaikaClipboard.js");

function quotation_paste_txt(){
  var ct = ChaikaClipboard.getString();
  return '>' + ct.split('\n').join("\n>");
}
function quotation_paste(){
  var insertTextbox = document.getElementById(document.getElementById("aaPanel").getAttribute("insertTextbox"));
  var leftValue = insertTextbox.value.substring(0, insertTextbox.selectionStart);
  var rightValue = insertTextbox.value.substring(insertTextbox.selectionEnd);
  insertTextbox.value = leftValue +  quotation_paste_txt() + rightValue;
}