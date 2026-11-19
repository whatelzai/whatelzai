-- The retired Developer page could recreate a singleton secret that MCP no longer accepts.
-- Current scoped OAuth credentials and the signing secret must remain untouched.
delete from public.system_config where key = 'mcp_token';
