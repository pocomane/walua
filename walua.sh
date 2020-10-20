#!/bin/sh

# Needed for container mode: docker
# Needed for host mode: python, git, cmake

if [ "$LUAURL" = "" ]; then
  #LUAURL="git"
  LUAURL="https://www.lua.org/ftp/lua-5.4.1.tar.gz"
fi

die() {
  echo "ERROR - $@"
  exit 127
}

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
    curl -L https://github.com/emscripten-core/emsdk/archive/2.0.7.tar.gz --output emsdk.tar.gz
    tar -xzf emsdk.tar.gz ||die "extracting emsdk"
    rm emsdk.tar.gz ||die "extacting emsdk"
    mv emsdk-* emsdk/ ||die "extracting emsdk"
    cd -
    cd "$WORKDIR/emsdk"
    ./emsdk install latest
    rm ~/.emscripten
    cd -
  fi
  CLANGDIR="$WORKDIR/emsdk/upstream/bin"
  EMDIR="$WORKDIR/emsdk/upstream/emscripten"
  NODEDIR="$WORKDIR/emsdk/node/$(ls $WORKDIR/emsdk/node)"

  export BINARYEN="$WORKDIR/emsdk/upstream"

  export PATH="$CLANGDIR:$NODEDIR/bin:$EMDIR:$PATH"
  echo "PATH: $PATH"

  cd "$WORKDIR"
  cd emsdk
  echo '#include <stdio.h>' > main.c
  echo 'int main(){ printf(""); }' >> main.c
  emcc main.c ||die "emcc not working"
  rm main.c
}

walua_make() {

  cd "$WORKDIR"
  if [ ! -d "lua" ]; then
    PREPARELUA="true"
  fi

  if [ "$PREPARELUA" = "true" ]; then
    cd "$WORKDIR"
    if [ "$LUAURL" = "git" ]; then
      git clone https://github.com/lua/lua ||die "extracting lua"
      cd lua
      mv onelua.c onelua.c.orig
      mv lua.c lua.c.origin
    else
      curl -L "$LUAURL" --output lua.tar.gz ||die "extracting lua"
      tar -xzf lua.tar.gz ||die "extracting lua"
      rm lua.tar.gz ||die "extracting lua"
      mv lua* lua.tmp ||die "extracting lua"
      mv lua.tmp/src ./lua ||die "extracting lua"
      rm -fR lua.tmp ||die "extracting lua"
      cd lua
      mv lua.c lua.c.origin
      mv luac.c luac.c.origin
    fi
  fi


  cd "$WORKDIR"
  echo "Compiling lua version:"
  grep '#define.*_VERSION' lua/lua.h

  cp "$LWDIR/main.js" prejs.js
  cp "$LWDIR/walua.c" lua/main.c

  cd "$WORKDIR"
  emcc -Os lua/*.c -s EXPORTED_FUNCTIONS="['_compile_lua','_continue_lua']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" -s MODULARIZE=1 -s 'EXPORT_NAME="WaLua"' --profiling --pre-js prejs.js -o walua.js

  ## Html with external wasm
  cd "$WORKDIR"
  OUT="playground_ref.html"
  rm -f $OUT
  csplit $LWDIR/playground.html '/<script id="INJECT">/+1'
  cat xx00 >> $OUT
  echo "</script>" >> $OUT
  echo "<script src='walua.js' type='text/javascript'>" >> $OUT
  cat xx01 >> $OUT
  rm xx*

  ## Javascript with embeded wasm
  cd "$WORKDIR"
  OUT="walua.merged.js"
  rm -f "$OUT"
  csplit "$WORKDIR/walua.js" '/var wasmBinaryFile = "walua.wasm";/+1'
  echo "// EMCC runtime injection" >> $OUT
  cat xx00 >> $OUT
  printf   '\n// WASM sub-injection - vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv...\n' >> $OUT
  printf 'var wasmBinaryFile = "data:application/octet-stream;base64,' >> $OUT
  base64 -w 0 walua.wasm >> $OUT
  printf '";\n// WASM sub-injection - ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^...\n' >> $OUT
  cat xx01 >> $OUT
  rm xx*

  ## Html with embeded wasm
  cd "$WORKDIR"
  cp $LWDIR/playground.html ./ 
  OUT="playground.html"
  rm -f "$OUT"
  csplit $LWDIR/playground.html '/<script id="INJECT">/+1'
  cat xx00 >> $OUT
  mv xx01 end_xx
  cat "$WORKDIR/walua.merged.js" >> $OUT
  cat end_xx >> $OUT
  rm end_xx
  rm xx*

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

