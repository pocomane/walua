
# WaLua - Lua web assembly builder

This script compiles a Web Assembly version of lua.

It downloads the lua sources and Emscripten utilities from the git
repositories.  However it still depends on some system installed software:
python, cmake and posix shell and utilities.

You can try the [on-line
version](https://raw.githack.com/pocomane/clientsideutil/master/build/luavm.html).

# Build

To build using the software from your os use:

```
./walua.sh make
```

Note that emsdk is still downloaded and any other system-wide
installation is ignored. This method requires python, git and cmake
installed on your machine.

To build using a container, use:

```
docker build -t walua .
docker run --rm -v "$PWD:/DATA" walua
```

This method requires docker installed and running on your machine.

The build script generates a `walua_build` subfolder in the current directory
containing all the files needed to run the PUC-Rio lua VM in a browser. Most of
the files and sub-folders are just needed at build time. The only release files
are: `walua.js` and `walua.wasm`. The `walua.merged.js` contains an
amalgamation of both `walua.js` and `walua.wasm` that can be used as a single
file release.

# Usage

To use walua, you just have to load `walua.js` from a html page, the
`walua.wasm` will be automatically loaded by it. It will expose the following
global function:

- `compile_lua` - It accept a string and compile it as lua chunk. It returns `0`
  if all is right, or `-1` if there is an error. In such case, it also write some
  information on the standard error (descripted in the following)
- `step_lua` - It performs an execution step. It returns `0` if no other step
  are needed, `1` otherwise. By default all the script previously
  passed to the `compile_lua` function is executed in one step, so it always
  returns `0`.

The following global function are used if defined:

- `append_output` is called everytime lua wants to write to the standard output. If
  undefined, `console.log` is used.
- `append_error` is called everytime lua wants to write to the standard error. If
  undefined, `console.log` is used.

The `compile_lua` and `step_lua` can be redefined by your lua code. The functions
just calls the lua functions stored in the `WALUA_COMPILE` and `WALUA_STEP` globals.
So, for example, the following javascript code:

```
compile_lua("WALUA_COMPILE = function() error('compilation disabled') end")
```

will disable any further compilation.

The defult compiler and runner are kept simple by purpose: it supposes that you
will write one suitable to your application. A simple exaple Is in
`playground.html`. More complex ones can be found int the [Client-side
tools](https://github.com/pocomane/clientsideutil) project, e.g. [Lua
playground](https://raw.githack.com/pocomane/clientsideutil/master/build/luavm.html).

# Example

In the `playground.html` there is a little usage example. The one in the root
directory is just a template, a runnable amalgamation can be found in the
distribution directory. It can be run directly from the disk without a proper
web server.

This example just run a lua code snipeet at startup, showing its stdout/stderr. You can easly change the snippet: it is at end of the html file, in the `<script>` tag with id `startup_code`.

So... just click on `playground.html` to let the browser run the lua code!

