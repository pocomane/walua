
# WaLua - Lua web assembly builder

This script compiles a Web Assembly version of lua.

It downloads the lua sources and Emscripten utilities from the git
repositories.  However it still depends on some system installed software:
python, cmake and posix shell and utilities.

# Usage

To build using the software from your os use:

```
./walua.sh make
```

Note that emsdk is still downloaded and any other system-wide
installation is ignored. This method requires python, git and cmake
installed on your machine.

To build using a container, use:

```
docker build -t walua
docker run -v "$PWD:/DATA" walua
```

This method requires docker installed and running on your machine.

# Output

It generates a `walua_build` subfolder in the current directory containing all
the files needed to run the PUC-Rio lua VM in a browser. All the sub-folders of
`walua_build` can be deleted: they are needed at build time only. The only release files are: `walua.js` and `walua.wasm`.

In the `walua_build` directory there is also an example that let
you to edit and run lua code: `playground.html` plus
`editor-ace.js`.  It use the [ace.js](https://ace.c9.io) editor,
that is downloaded from the git repository too.  You can run it
from the disk, or try the [on-line
version](https://raw.githack.com/pocomane/walua/master/walua_build/playground.html).

