
#include <stdio.h>
#include <string.h>

#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"

#define COMPILER_GLOBAL_VAR "WALUA_COMPILE"
#define RUNNER_GLOBAL_VAR "WALUA_STEP"

/*
#define LOG(...) fprintf(stderr, __VA_ARGS__)
static int debug_print_lua_stack(lua_State*lua) {
  LOG("DEBUG lua stack ");
  for (int i=1; i<9; i+=1){
    LOG("[%d]%s ",i,lua_typename(lua, lua_type(lua, i)));
  }
  LOG("\n");
  return 0;
}
*/

const char lua_bootstrap[] = ""
  COMPILER_GLOBAL_VAR " = function(webscript)\n"
    "local err\n"
    RUNNER_GLOBAL_VAR ", err = load(webscript, 'embedded-code')\n"
    "if not err then return 0 end\n"
    "io.stderr:write(err,'\\r\\n')\n"
    "return -1\n"
  "end\n"
;

static lua_State* lua = 0;

int compile_lua(const char* script) {

  /* Prepare lua state */
  if (lua == 0){
    lua = luaL_newstate();
    luaL_openlibs(lua);
    lua_getglobal(lua, "load");
    lua_pushstring(lua, lua_bootstrap);
    lua_call(lua, 1, 1);
    lua_call(lua, 0, 0);
    lua_settop(lua,0);
  }

  /* Compile the script */
  lua_getglobal(lua, COMPILER_GLOBAL_VAR);
  lua_pushstring(lua, script);
  lua_call(lua, 1, 1);

  /* Check that all is right */
  int result = lua_tointeger(lua, -1);
  lua_pop(lua, 1);
  return result;
}

int continue_lua() {

  /* Get the runner function */
  lua_getglobal(lua, RUNNER_GLOBAL_VAR);
  
  // TODO : check the content of the RUNNER_GLOBAL_VAR global ???
  
  /* Get the launcher function */
  lua_call(lua, 0, 1);
  
  /* Get the result and clear the stach */
  int result = lua_tointeger(lua, -1);
  lua_pop(lua, 1);
  return result;
}

