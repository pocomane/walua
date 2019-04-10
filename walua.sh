#!/bin/sh

# Needed for container mode: docker
# Needed for host mode: python, git, cmake

LWDIR="$(dirname $(readlink -f "$0"))"

mkdir -p walua_build
cd walua_build
WORKDIR="$PWD"

prepare_emscripten(){

  cd "$WORKDIR"
  if [ ! -d "emsdk" ]; then
    PREPARESDK="true"
  fi
  
  if [ "$PREPARESDK" = "true" ]; then
    cd "$WORKDIR"
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    ./emsdk install latest
    rm ~/.emscripten
  fi
  CLANGDIR="$WORKDIR/emsdk/clang/$(ls $WORKDIR/emsdk/clang)"
  EMDIR="$WORKDIR/emsdk/emscripten/$(ls $WORKDIR/emsdk/emscripten)"
  NODEDIR="$WORKDIR/emsdk/node/$(ls $WORKDIR/emsdk/node)"

  export PATH="$CLANGDIR:$NODEDIR/bin:$EMDIR:$PATH"
  echo "PATH: $PATH"

  if [ "$PREPARESDK" = "true" ]; then
    cd "$WORKDIR"
    cd emsdk
    echo '#include <stdio.h>' > main.c
    echo 'int main(){ printf(""); }' >> main.c
    emcc main.c
    rm main.c
  fi
}

walua_make() {

  cd "$WORKDIR"
  if [ ! -d "lua" ]; then
    PREPARELUA="true"
  fi
  if [ ! -d "ace-builds" ]; then
    PREPAREACE="true"
  fi

  if [ "$PREPARELUA" = "true" ]; then
    cd "$WORKDIR"
    git clone https://github.com/lua/lua
    cd lua
    mv onelua.c onelua.c.orig
    mv lua.c lua.c.origin
  fi

  cd "$WORKDIR"
  cp "$LWDIR/main.js" prejs.js
  cp "$LWDIR/walua.c" lua/main.c

  if [ "$PREPAREACE" = "true" ]; then
    cd "$WORKDIR"
    git clone https://github.com/ajaxorg/ace-builds
  fi

  cd "$WORKDIR"
  emcc -Os lua/*.c -s EXPORTED_FUNCTIONS="['_compile_lua','_continue_lua']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" -s MODULARIZE=1 -s 'EXPORT_NAME="WaLua"' --pre-js prejs.js -o walua.js

  cd "$WORKDIR"
  cat "$WORKDIR/ace-builds/src-min/ace.js" > ./editor-ace.js
  echo ";" >> ./editor-ace.js
  cat "$WORKDIR/ace-builds/src-min/mode-lua.js" >> ./editor-ace.js
  cp "$LWDIR/playground.html" ./

  cd "$WORKDIR"
  echo "done:"
  rm prejs.js
  ls
}

cli_parser(){

  if [ "$1" = "" ]; then
    echo "Build with:"
    echo "  $0 make"
    echo "Clear all with:"
    echo "  $0 clear"
    exit 0
  fi

  if [ "$1" = "clear" ]; then
    cd "$WORKDIR"
    rm -fR walua_build/
    exit 0
  fi

  if [ "$1" = "docker_make" ]; then
    cd "$WORKDIR"
    walua_make
    exit $?
  fi

  if [ ! "$1" = "make" ]; then
    exit -1
  fi

  prepare_emscripten
  walua_make
  exit $?
}

cli_parser $@

