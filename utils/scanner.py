import ctypes

class ActiveWindowScanner:
    """Scans active windows to identify desktop apps (VLC, Media Player)"""
    def __init__(self, track_title):
        self.track_lower = (track_title or "").lower().strip()
        self.found_platform = "windows"
        self.found_title = track_title or "Unknown Title"
        
        EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
        self.c_callback = EnumWindowsProc(self._check_window)

    def _check_window(self, hwnd, lparam):
        if not ctypes.windll.user32.IsWindowVisible(hwnd):
            return True
            
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return True
            
        buff = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
        window_title = buff.value.lower()
        real_title = buff.value

        # Detect VLC and extract the exact video file name directly from the window
        if "vlc" in window_title:
            self.found_platform = "vlc"
            self.found_title = real_title.rsplit(" - VLC media player", 1)[0].strip()
            return False  

        # Detect standard Windows Media Players
        elif "media player" in window_title or "movies & tv" in window_title:
            self.found_platform = "media_player"
            return False
        return True

    def scan(self):
        if self.track_lower:
            ctypes.windll.user32.EnumWindows(self.c_callback, 0)
        return self.found_platform, self.found_title