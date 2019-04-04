
#include <stdio.h>
#include <string.h>

#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"

static int msghandler (lua_State *L) {

  /* print the error message */
  const char *msg = lua_tostring(L, -1);
  if (msg != NULL){
    fprintf(stderr, "%s\n",msg);
  } else {
    fprintf(stderr, "(error object is a '%s' value)\n", luaL_typename(L, -1));
  }

  /* print the stack trace */
  luaL_traceback(L, L, "", 1);
  const char *tb = lua_tostring(L, -1);
  fprintf(stderr, "%s\n", tb);
  lua_pop(L, 1);

  return 0;
}

static int docall (lua_State *L, int narg, int nres) {
  int status;
  int base = lua_gettop(L) - narg;  /* function index */
  lua_pushcfunction(L, msghandler);  /* push message handler */
  lua_insert(L, base);  /* put it under function and args */
  status = lua_pcall(L, narg, nres, base);
  lua_remove(L, base);  /* remove message handler from the stack */
  return status;
}

int run_lua(const char* script) {
  static lua_State* lua = 0;

  /* Prepare lua state */
  if (lua == 0){
    lua = luaL_newstate();
    luaL_openlibs(lua);
  }
  
  /* Prepare lua compiler */
  int narg = 2;
  lua_getglobal(lua, "load");
  lua_pushstring(lua, script);
  lua_pushstring(lua, "root-code");

  /* Compile the lua code */
  lua_call(lua, narg, 2);
  if (strcmp("function", luaL_typename(lua, -2))) { /* on error */
    msghandler(lua); /* call the handler on the error string */
    lua_pop(lua, 2); /* clear the stack */
    return LUA_ERRSYNTAX;
  }
  lua_pop(lua, 1);

  /* Execute the lua code */
  int status = docall(lua, 0, 0);
  return status;
}

