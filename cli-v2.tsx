import fs from 'fs';
import { Box, render, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import path from 'path';
import { useState } from 'react';

// --- Types ---
interface RuntimeConfig {
  project_path: string;
  storage_path: string;
  framework: string;
}

// --- Logic Helpers ---
const ROOT = process.cwd();
const RUNTIME_FILE = path.join(ROOT, "runtime-config.json");

function loadConfig(): RuntimeConfig {
  try {
    if (fs.existsSync(RUNTIME_FILE)) {
      return JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf-8'));
    }
  } catch {}
  return { project_path: ROOT, storage_path: path.join(ROOT, ".oshx"), framework: "personalizado" };
}

// --- Components ---

const Header = () => (
  <Box borderStyle="single" borderColor="white" paddingX={2} marginBottom={1} flexDirection="column">
    <Text bold italic color="white">OSHX OPERATIONAL CONSOLE</Text>
    <Text dimColor white>v1.0.0 • Collaboration over MCP</Text>
  </Box>
);

const App = () => {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'error' | 'success' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'nav'>('chat');

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev.slice(-10), { msg, type }]);
  };

  useInput((input, key) => {
    if (key.escape) exit();
    if (input === 'q') exit();
  });

  const handleSubmit = async (value: string) => {
    const cmd = value.trim().toLowerCase();
    setQuery('');
    
    if (cmd === 'exit' || cmd === '/quit') exit();
    
    setLoading(true);
    addLog(`> ${value}`, 'info');

    // Simulate command processing
    setTimeout(() => {
      if (cmd === 'doctor') {
        const cfg = loadConfig();
        addLog(`Checking ${cfg.project_path}...`, 'info');
        addLog(`System Status: OK`, 'success');
      } else if (cmd === 'help' || cmd === '?') {
        addLog(`Commands: doctor, init, start, config, exit`, 'info');
      } else {
        addLog(`Unknown command: ${cmd}. Type 'help' for options.`, 'error');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <Box flexDirection="column" padding={1} minHeight={15}>
      <Header />
      
      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {logs.map((log, i) => (
          <Box key={i}>
            <Text color={log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'white'}>
               {log.msg}
            </Text>
          </Box>
        ))}
        {loading && (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" /> Processing...
            </Text>
          </Box>
        )}
      </Box>

      <Box borderStyle="round" borderColor="white" paddingX={1}>
        <Box marginRight={1}>
          <Text bold color="white">oshx</Text>
          <Text color="gray"> ›</Text>
        </Box>
        <TextInput 
          value={query} 
          onChange={setQuery} 
          onSubmit={handleSubmit} 
          placeholder="Type a command or ask a question..."
        />
      </Box>
      
      <Box marginTop={1} paddingX={1}>
        <Text dimColor white>Press ESC or type 'exit' to close</Text>
      </Box>
    </Box>
  );
};

render(<App />);
