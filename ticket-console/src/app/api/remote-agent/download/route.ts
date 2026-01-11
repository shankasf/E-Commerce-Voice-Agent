/**
 * Download Endpoint for Remote Support Agent Installer
 * 
 * Serves the standalone executable for non-technical users.
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Path to the built executable
    // In production, this would be in a public directory or CDN
    const executablePath = join(
      process.cwd(),
      'endpoint-agent',
      'dist',
      'RemoteSupportAgent.exe'
    );

    // Check if file exists
    try {
      const fileBuffer = await readFile(executablePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="RemoteSupportAgent.exe"',
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (fileError) {
      // File doesn't exist - return instructions instead
      return NextResponse.json(
        {
          error: 'Installer not yet built',
          message: 'The installer executable needs to be built first. See endpoint-agent/build_installer.py',
          instructions: {
            step1: 'Run: cd endpoint-agent && python build_installer.py',
            step2: 'This will create dist/RemoteSupportAgent.exe',
            step3: 'Place the executable in a public location or CDN',
          },
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to serve installer', message: error?.message },
      { status: 500 }
    );
  }
}


