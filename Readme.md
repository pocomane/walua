= WaLua - Lua web assembly builder

This script compiles a Web Assembly version of lua.

It downloads the lua sources and Emscripten utilities from the git
repositories.  However it still depends on some system installed software:
python, cmake and posix shell and utilities.

Usage:

```
./walua.sh make
```

It generates a `walua_build` subfolder in the current directory containing all
the files needed to run the PUC-Rio lua VM in a browser. All the sub-folders of
`walua_build` can be deleted: they are needed at build time only.

In the `walua_build` directory there is also an example html file that let you to edit
and run lua code: `playground.html`. The editor is [ace.js](https://ace.c9.io)
and it is downloaded from the git repository too.

