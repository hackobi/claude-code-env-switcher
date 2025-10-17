# Claude Code Environment Switcher

A bash script that allows you to switch between different Claude Code environments and API configurations quickly and safely.

## Features

- **Environment Switching**: Switch between default Claude, GLM-4.5, and reset authentication
- **Safe Configuration**: Preserves your OAuth sessions and SuperClaude configurations
- **Smart Backup**: Automatically backs up and restores important settings
- **Authentication Management**: Includes both gentle switches and nuclear auth reset options

## Installation

1. Clone or download this repository
2. Copy the script to your desired location:
   ```bash
   cp claude-code-env-switcher.sh ~/.claude/claude-code-env-sets.sh
   ```
3. Make the script executable:
   ```bash
   chmod +x ~/.claude/claude-code-env-sets.sh
   ```
4. Source the script in your shell configuration:
   ```bash
   echo 'source ~/.claude/claude-code-env-sets.sh' >> ~/.bashrc
   # or for zsh:
   echo 'source ~/.claude/claude-code-env-sets.sh' >> ~/.zshrc
   ```

## Usage

### Available Environments

- **default**: Switch back to your default Claude subscription (preserves OAuth)
- **GLM-4.5**: Switch to GLM-4.5 model via z.ai API
- **reset-auth**: Nuclear option to reset all authentication (use when OAuth is broken)

### Switching Environments

```bash
# Switch to default Claude
ccenv default

# Switch to GLM-4.5 (requires API token configuration)
ccenv GLM-4.5

# Reset authentication (use when OAuth is broken)
ccenv reset-auth
```

### Configuration

Before using the GLM-4.5 environment, you need to configure your API token:

1. Open the script file:
   ```bash
   nano ~/.claude/claude-code-env-sets.sh
   ```

2. Find the GLM-4.5 section and replace `YOUR_API_TOKEN_HERE` with your actual API token:
   ```bash
   export ANTHROPIC_AUTH_TOKEN="your_actual_token_here"
   ```

3. Save the file and reload your shell or source the script again.

## What Each Environment Does

### `default`
- Clears any custom API endpoints or models
- Preserves your OAuth session
- Removes model overrides from settings.json
- No restart required

### `GLM-4.5`
- Sets API endpoint to `https://api.z.ai/api/anthropic`
- Configures model to `GLM-4.5`
- Updates Claude Code settings.json
- Requires API token configuration

### `reset-auth`
- Clears all environment variables
- Removes authentication files
- Kills Claude Code processes
- Preserves statusLine and SuperClaude configurations
- Requires Claude Code restart and `/login`

## Safety Features

- **Configuration Preservation**: Your statusLine, components, framework, and SuperClaude settings are preserved during switches
- **Backup System**: Automatically creates backups of settings.json before making changes
- **Graceful Fallbacks**: Uses jq when available, falls back to manual parsing when not
- **Process Management**: Safely kills Claude Code processes during auth reset

## Troubleshooting

### OAuth Issues
If you experience authentication problems:
1. Try switching to default first: `ccenv default`
2. If that doesn't work, use the nuclear option: `ccenv reset-auth`
3. Restart Claude Code and run `/login`

### Settings Not Applying
- Ensure the script is sourced in your shell configuration
- Check that jq is installed for best results: `brew install jq` (macOS) or `sudo apt install jq` (Ubuntu)
- Verify your API token is correctly configured for GLM-4.5

### Missing Dependencies
The script works best with `jq` for JSON manipulation, but includes fallbacks for systems without it.

## File Locations

The script operates on these files:
- `~/.claude/settings.json` - Claude Code configuration
- `~/.claude/settings.json.backup` - Automatic backup
- `~/.claude/.credentials.json` - Credentials (removed during auth reset)
- `~/.config/claude-code/` - Config directory (cleared during auth reset)
- `~/.cache/claude-code/` - Cache directory (cleared during auth reset)

## Adding New Environments

To add a new environment, modify the `CCENV_ENV_NAMES` array and add a new case in the `ccenv_apply_env()` function:

```bash
# Add to array
CCENV_ENV_NAMES=( default GLM-4.5 reset-auth my-new-env )

# Add case in function
my-new-env)
  export ANTHROPIC_BASE_URL="https://api.example.com"
  export ANTHROPIC_AUTH_TOKEN="your_token"
  export ANTHROPIC_MODEL="your-model"
  cc__update_claude_settings "your-model"
  echo "✅ Switched to my-new-env"
  return 0
  ;;
```