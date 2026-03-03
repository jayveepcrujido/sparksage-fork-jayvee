import time
from collections import deque
import config

class RateLimiter:
    def __init__(self):
        # Maps key (user_id or guild_id) to a deque of timestamps
        self.user_windows = {}
        self.guild_windows = {}

    def is_rate_limited(self, user_id: str, guild_id: str | None = None) -> tuple[bool, str]:
        """
        Check if a request is rate limited for a user or guild.
        Returns (is_limited, reason).
        """
        now = time.time()
        minute_ago = now - 60

        # Check User Limit
        if user_id not in self.user_windows:
            self.user_windows[user_id] = deque()
        
        user_window = self.user_windows[user_id]
        # Remove timestamps older than 1 minute
        while user_window and user_window[0] < minute_ago:
            user_window.popleft()
            
        if len(user_window) >= config.RATE_LIMIT_USER:
            return True, f"User rate limit exceeded ({config.RATE_LIMIT_USER} req/min). Please wait a moment."

        # Check Guild Limit
        if guild_id:
            if guild_id not in self.guild_windows:
                self.guild_windows[guild_id] = deque()
            
            guild_window = self.guild_windows[guild_id]
            while guild_window and guild_window[0] < minute_ago:
                guild_window.popleft()
                
            if len(guild_window) >= config.RATE_LIMIT_GUILD:
                return True, f"Server-wide rate limit reached ({config.RATE_LIMIT_GUILD} req/min). Try again shortly."

        # Not limited, add timestamp
        user_window.append(now)
        if guild_id:
            self.guild_windows[guild_id].append(now)
            
        return False, ""

# Singleton instance
limiter = RateLimiter()
