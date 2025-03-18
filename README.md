# TutorTrack Virtual Whiteboard

A real-time, interactive whiteboard for live tutoring sessions on TutorTrack. This whiteboard supports real-time collaboration between tutors and students, allowing them to write, draw, upload images/PDFs, and interact with tools like shape drawing, an equation editor, and a laser pointer.

## Features

- Real-time collaboration using WebSockets
- Drawing tools: pen, eraser, shapes, text, equations
- File uploads: images and PDFs
- Laser pointer for temporary highlighting
- Undo/redo functionality
- Dark mode support
- User cursor tracking
- Responsive design

## Tech Stack

- **Frontend**: React, Fabric.js, Socket.io Client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (optional, for future persistence)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm run install-all