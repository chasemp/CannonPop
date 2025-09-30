#!/usr/bin/env python3

"""
Auto-reload development server for static PWAs
Based on MealPlanner PWA lessons learned
"""

import http.server
import socketserver
import threading
import time
import subprocess
import signal
import sys
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ReloadHandler(FileSystemEventHandler):
    def __init__(self, restart_callback):
        self.restart_callback = restart_callback
        self.last_restart = 0
        self.debounce_delay = 1  # 1 second debounce
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        # Only reload for relevant file types
        relevant_extensions = {'.html', '.js', '.css', '.json', '.md', '.ts', '.svelte'}
        file_path = Path(event.src_path)
        
        if file_path.suffix.lower() in relevant_extensions:
            current_time = time.time()
            if current_time - self.last_restart > self.debounce_delay:
                print(f"🔄 File changed: {file_path.name}")
                self.last_restart = current_time
                self.restart_callback()

class DevServer:
    def __init__(self, port=8080):
        self.port = port
        self.server_process = None
        self.observer = None
        
    def start_server(self):
        """Start the HTTP server in a separate process"""
        if self.server_process:
            self.stop_server()
            
        try:
            self.server_process = subprocess.Popen([
                'python3', '-m', 'http.server', str(self.port)
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            print(f"🚀 Server started on http://localhost:{self.port}")
        except Exception as e:
            print(f"❌ Failed to start server: {e}")
            
    def stop_server(self):
        """Stop the HTTP server"""
        if self.server_process:
            self.server_process.terminate()
            try:
                self.server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.server_process.kill()
            self.server_process = None
            print("🛑 Server stopped")
            
    def restart_server(self):
        """Restart the server"""
        print("🔄 Restarting server...")
        self.stop_server()
        time.sleep(0.5)  # Brief pause
        self.start_server()
        
    def start_file_watcher(self):
        """Start watching files for changes"""
        event_handler = ReloadHandler(self.restart_server)
        self.observer = Observer()
        
        # Watch current directory and subdirectories
        watch_paths = ['.', 'src', 'public', 'css', 'js']
        for path in watch_paths:
            if Path(path).exists():
                self.observer.schedule(event_handler, path, recursive=True)
                print(f"👁️  Watching: {path}")
                
        self.observer.start()
        
    def run(self):
        """Main server loop"""
        print("🎯 BustAGroove Auto-Reload Development Server")
        print("=" * 50)
        
        # Start initial server
        self.start_server()
        
        # Start file watcher
        self.start_file_watcher()
        
        print(f"📁 Serving files from: {Path.cwd()}")
        print(f"🌐 Open: http://localhost:{self.port}")
        print("📝 Watching for file changes...")
        print("⌨️  Press Ctrl+C to stop")
        print()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down...")
            
        # Cleanup
        if self.observer:
            self.observer.stop()
            self.observer.join()
        self.stop_server()
        print("✅ Development server stopped")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Received interrupt signal")
    sys.exit(0)

if __name__ == "__main__":
    # Handle Ctrl+C gracefully
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start development server on different port to avoid conflicts
    server = DevServer(port=8081)
    server.run()
