cmake_minimum_required(VERSION 3.20)
project(IntraViewOverlay)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Output directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Source files
add_executable(IntraViewOverlay
    src/main.cpp
    src/OverlayWindow.cpp
    src/OverlayWindow.h
    src/IPCManager.cpp
    src/IPCManager.h
)

# Link Windows libraries
target_link_libraries(IntraViewOverlay
    d2d1
    dwrite
    dcomp
    user32
    gdi32
    dwmapi
)

# Enable Unicode
target_compile_definitions(IntraViewOverlay PRIVATE UNICODE _UNICODE)

# Set subsystem to Windows (no console)
if(MSVC)
    set_target_properties(IntraViewOverlay PROPERTIES
        LINK_FLAGS "/SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup"
    )
endif()
