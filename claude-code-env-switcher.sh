#!/usr/bin/env bash

# User environment definitions for claude-code-env-switcher

# List available environments
typeset -a CCENV_ENV_NAMES
CCENV_ENV_NAMES=( default GLM-4.5 reset-auth )

# Vars to clear on every switch
typeset -a CCENV_MANAGED_VARS
CCENV_MANAGED_VARS=( ANTHROPIC_BASE_URL ANTHROPIC_MODEL )

# Optional globals applied for every env before the specific env
ccenv_globals() {
  : "${API_TIMEOUT_MS:=600000}"
  export API_TIMEOUT_MS
}

# Backup and restore settings.json preserving statusLine and SuperClaude config
cc__backup_restore_settings() {
  local settings_file="$HOME/.claude/settings.json"
  local backup_file="$HOME/.claude/settings.json.backup"
  
  if [ -f "$settings_file" ]; then
    # Create backup
    cp "$settings_file" "$backup_file"
    
    # Extract and preserve important configs using jq if available
    if command -v jq >/dev/null 2>&1; then
      # Extract statusLine, components, framework, and other non-auth configs
      jq '{
        statusLine: .statusLine,
        components: .components,
        framework: .framework,
        includeCoAuthoredBy: .includeCoAuthoredBy,
        permissions: .permissions,
        model: .model
      } | with_entries(select(.value != null))' "$backup_file" > "$settings_file"
    else
      # Fallback: manually preserve known important lines
      grep -E '(statusLine|components|framework|includeCoAuthoredBy|permissions|"model":)' "$backup_file" > "$settings_file.temp" || echo "{}" > "$settings_file.temp"
      # Wrap in proper JSON structure if content exists
      if [ -s "$settings_file.temp" ]; then
        echo "{" > "$settings_file"
        cat "$settings_file.temp" >> "$settings_file"
        echo "}" >> "$settings_file"
      else
        echo "{}" > "$settings_file"
      fi
      rm -settings_file.temp"
    fi
  fi
}

# Claude Code authentication reset (nuclear option for OAuth issues)
cc__reset_auth() {
  echo "🧹 Resetting Claude Code authentication..."
  
  # Clear environment variables
  unset ANTHROPIC_BASE_URL
  unset ANTHROPIC_AUTH_TOKEN  
  unset ANTHROPIC_MODEL
  unset ANTHROPIC_API_KEY
  
  # Backup and clean settings.json (preserve statusLine and SuperClaude)
  cc__backup_restore_settings
  
  # Remove only auth-related files (preserve SuperClaude .md files)
  rm -f ~/.claude/.credentials.json
  rm -rf ~/.config/claude-code/
  rm -rf ~/.cache/claude-code/
  
  # Kill Claude Code processes
  pkill -f "claude" >/dev/null 2>&1 || true
  
  echo "✅ Auth reset complete. Restart Claude Code and run /login"
  echo "📝 Your statusLine and SuperClaude configs have been preserved"
}

# Gentle switch to default (preserves OAuth, just clears overrides)
cc__switch_to_default() {
  local settings_file="$HOME/.claude/settings.json"
  
  # Clear environment overrides (keeps OAuth intact)
  # Note: Don't unset ANTHROPIC_AUTH_TOKEN to preserve OAuth
  unset ANTHROPIC_BASE_URL
  unset ANTHROPIC_MODEL
  unset ANTHROPIC_API_KEY
  
  # Remove model override from settings.json but preserve everything else
  if [ -f "$settings_file" ] && command -v jq >/dev/null 2>&1; then
    # Remove only the env.ANTHROPIC_MODEL, keep everything else
    jq 'del(.env.ANTHROPIC_MODEL) | if (.env | length) == 0 then del(.env) else . end' "$settings_file" > "$settings_file.tmp" && mv "$settings_file.tmp" "$settings_file"
  fi
  
  echo "✅ Switched to default Claude subscription model"
  echo "📝 OAuth session preserved - no restart needed"
}

# Update Claude Code settings.json file (model only, preserve other settings)
cc__update_claude_settings() {
  local model="$1"
  local settings_file="$HOME/.claude/settings.json"
  
  if [ -z "$model" ]; then
    # Remove model from settings.json when clearing
    if [ -f "$settings_file" ] && command -v jq >/dev/null 2>&1; then
      jq 'del(.env.ANTHROPIC_MODEL) | if (.env | length) == 0 then del(.env) else . end' "$settings_file" > "$settings_file.tmp" && mv "$settings_file.tmp" "$settings_file"
    fi
    return 0
  fi
  
  if [ ! -f "$settings_file" ]; then
    # Create minimal file if it doesn't exist
    mkdir -p "$HOME/.claude"
    echo '{}' > "$settings_file"
  fi
  
  # Update model using jq if available
  if command -v jq >/dev/null 2>&1; then
    # Ensure .env exists and set the model
    jq --arg model "$model" '.env.ANTHROPIC_MODEL = $model' "$settings_file" > "$settings_file.tmp" && mv "$settings_file.tmp" "$settings_file"
  fi
}

# Apply an environment by name. Return non-zero for unknown.
ccenv_apply_env() {
  case "$1" in
    default)
      # Gentle switch - preserve OAuth session, just clear overrides
      cc__switch_to_default
      return 0
      ;;

    GLM-4.5)
      export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
      # Replace YOUR_API_TOKEN_HERE with your actual token
      export ANTHROPIC_AUTH_TOKEN="YOUR_API_TOKEN_HERE"
      export ANTHROPIC_MODEL="GLM-4.5"
      # Update settings.json to match
      cc__update_claude_settings "GLM-4.5"
      echo "✅ Switched to GLM-4.5"
      echo "⚠️  Remember to replace YOUR_API_TOKEN_HERE with your actual token"
      return 0
      ;;

    reset-auth)
      # Nuclear option - only use when OAuth is broken
      cc__reset_auth
      return 0
      ;;

    *)
      return 2
      ;;
  esac
}