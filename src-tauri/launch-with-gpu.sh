#!/bin/bash

# Script to launch STS Stat Viewer with hardware acceleration enabled on Linux
# This enables GPU acceleration for better performance with WebKitGTK

# Enable hardware acceleration
export WEBKIT_DISABLE_COMPOSITING_MODE=0
export WEBKIT_DISABLE_DMABUF_RENDERER=0

# Force GPU acceleration
export GDK_BACKEND=x11  # or wayland if you prefer

# Optional: Enable additional WebKit features
export WEBKIT_FORCE_COMPLEX_TEXT=1

# Launch the application
./sts-stat-viewer "$@"
