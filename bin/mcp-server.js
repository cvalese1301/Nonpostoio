#!/usr/bin/env node

/**
 * NonPosto.io - Model Context Protocol (MCP) Stdio Server
 * Compatible with Claude Desktop, Cursor, Antigravity and custom AI agents
 */

const readline = require('readline');
const { initDb } = require('../server/db/database');
const { MCP_TOOLS, handleMcpToolCall } = require('../server/mcp/mcpTools');

async function main() {
  await initDb();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line);
      const { id, method, params } = request;

      if (method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'nonposto-mcp-server',
              version: '1.0.0'
            }
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        return;
      }

      if (method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
        return;
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        try {
          const result = await handleMcpToolCall(toolName, toolArgs);
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        } catch (err) {
          const response = {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: err.message
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        }
        return;
      }

      // Unsupported method
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method '${method}' not found` }
      }) + '\n');
    } catch (e) {
      process.stderr.write(`[MCP Error] ${e.message}\n`);
    }
  });

  process.stderr.write('[NonPosto MCP] Server ready on stdio\n');
}

main().catch(err => {
  process.stderr.write(`[MCP Fatal] ${err.message}\n`);
  process.exit(1);
});
