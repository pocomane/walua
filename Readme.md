
# WaLua - Lua web assembly builder

This script compiles a Web Assembly version of lua.

It downloads the lua sources and Emscripten utilities from the git
repositories.  However it still depends on some system installed software:
python, cmake and posix shell and utilities.

You can try the [on-line
version](https://raw.githack.com/pocomane/walua/master/walua_build/playground.html).

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
containing all the files needed to run the PUC-Rio lua VM in a browser. All the
sub-folders of `walua_build` can be deleted: they are needed at build time
only. The only release files are: `walua.js` and `walua.wasm`.

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
will write one suitable to your application. A more complex example is in
`playground.html`.

# Playground

The build script generatates alaso an example application that let you to edit
and run lua code in the browser. The editor is
[codeflask.js](https://kazzkiq.github.io/CodeFlask) and it is downloaded from
the git repository too.

The playground is generated in the `playground.html` file and it embeds all the
documents it needs to work. The build script also generate a classic version
with referenced documents. It is composed by the following files:
`playground_ref.html`, `walua.wasm`, `walua.js` and `codeflask.min.js`.

If you do not have a proper web server, you can also run it from disk. The
classic version probably needs the browser to be configured properly. I.e.
file:// and CORS must be allowed when loading a file from the disk. Instead,
the embedded version should work out of the box.

The playground uses a error handler to write stack dump in case of error.

Please note that the browser blocks while the script is running, so the browser
is not updated during the execution. There is a quick workaround in the
playground.  Normally the [following
code](https://raw.githack.com/pocomane/walua/master/walua_build/playground.html?cHJpbnQnb25lJwpsb2NhbCBzID0gb3MuY2xvY2soKQp3aGlsZSBvcy5jbG9jaygpIC0gcyA8IDIgZG8gZW5kCnByaW50J3R3byc=):

```
print'one'
local s = os.clock()
while os.clock() - s < 1 do end
print'two'
```

will show `one` and `two` in a single step, after ~1 second.  If you call the
lua function `set_collaborative()`, the next scripts will start to behave as it
was asynchronous, i.e. `one` is written immediately, then `two` is written
after ~1 second. You can switch back to the normal mode with `set_monolitic()`.

The system leverages the collaborative multitasking features of lua and the
browser. `set_collaborative` overloads the lua IO operation to yield after each
operation. The lua code compiler and launcher is overloaded too, with one that
wraps the whole user code into a coroutine. In this way after each IO operation
the control is given to the browser that can update the page.

Some Notes:

- The `step_lua` javascript function is continously called until there are no
  more yields.
- No yield parameters/returns are handled, i.e. zero values are always
  passed/returned during the resume/yield phase.
- There can be issues if you call IO operation inside a sub-coroutine.

To extend this system to other lua function, you have to wrap it in another one
that yield just before to return. You can do this automatically in the
playground with the utility lua function `yieldwrap`:

```
yieldwrap( _ENV, 'myfunction' )
set_collaborative()
```

where `myfunction` is the name of the function to be wrapped. In this way the
browser have the chance to update the page before `myfunction` returns.

