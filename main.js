
Module.print = function(txt) {
  if (null != append_output) {
    append_output(txt);
  } else {
    console.log(txt);
  }
};

Module.printErr = function(txt) {
  if (null != append_error) {
    append_output(txt);
  } else {
    console.log(txt);
  }
};

compile_lua = function (scr){
  return Module.ccall("compile_lua", 'number', ['string'], [scr]);
}

step_lua = function(){
  return Module.ccall("continue_lua", 'number', [], []);
}

