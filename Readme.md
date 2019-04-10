
# WaLua - Lua web assembly builder

This script compiles a Web Assembly version of lua.

It downloads the lua sources and Emscripten utilities from the git
repositories.  However it still depends on some system installed software:
python, cmake and posix shell and utilities.

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
docker build -t walua
docker run --rm -v "$PWD:/DATA" walua
```

This method requires docker installed and running on your machine.

# Usage

The build script generates a `walua_build` subfolder in the current directory
containing all the files needed to run the PUC-Rio lua VM in a browser. All the
sub-folders of `walua_build` can be deleted: they are needed at build time
only. The only release files are: `walua.js` and `walua.wasm`.

To use walua, you just have to load `walua.js` from a html page. It will expose
the following global function:

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
compile_lua("WEBCOMPILE = function() error('compilation disabled') end")
```

will disable any further compilation.

The code compiler and runner is kept simple by purpose: it suppose you write
your own for your application. A more complex example is in `playground.html`.

# Playground

In the `walua_build` directory there is also an example that let you to
edit and run lua code: `playground.html` plus `editor-ace.js`.  It use the
[ace.js](https://ace.c9.io) editor, that is downloaded from the git
repository too.  You can try the [on-line
version](https://raw.githack.com/pocomane/walua/master/walua_build/playground.html).
You can also run it from disk, but probably you need to configure your
broser to allows file:// and CORS when loading a file from the disk
(firefox should do it by default).

The ouput of the code is updated in a way that seems asyncronous. E.g. [running
the following code](https://raw.githack.com/pocomane/walua/master/walua_build/playground.html?cHJpbnQnb25lJwpsb2NhbCBzID0gb3MuY2xvY2soKQp3aGlsZSBvcy5jbG9jaygpIC0gcyA8IDIgZG8gZW5kCnByaW50J3R3byc=):

```
print'one'
local s = os.clock()
while os.clock() - s < 2 do end
print'two'
```

you can see the `one` ~2 seconds before the `two`.

The system leverages the collaborative multitasking features of lua and the
browser. The lua IO operation are overloaded to yield after each operation. The
lua code compiler and launcher is overloaded too, with one that wrapa the whole
user code into a coroutine. In this way after each IO operation the control is
given to the browser that can update the page. The `step_lua` function is
continously called until there are no more yields.

To extend this system to other lua function, you have to wrap e it in another
one that yield just before to return. You can do this, for example, with the
`makeyield` lua function in the `playground.html`:

```
myfunction = makeyield( myfunction )
```

In this way the browser have the chance to update the page before `myfunction`
returns. No yield parameters/returns are handled, i.e. zero values are always
passed/returned during the resume/yield phase.

