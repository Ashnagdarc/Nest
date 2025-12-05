"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { clearAllSupabaseAuth } from '@/lib/supabase/storage-recovery';

export default function DebugLoginPage() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearStorage = () => {
    try {
      clearAllSupabaseAuth();
      addLog('Auth storage cleared successfully');
    } catch (error: any) {
      addLog(`Storage clear error: ${error.message}`);
    }
  };

  const testClient = () => {
    try {
      const supabase = createClient();
      addLog('Supabase client created successfully');
      
      // Test getUser
      supabase.auth.getUser().then(({ data, error }) => {
        if (error) {
          addLog(`getUser error: ${error.message}`);
        } else {
          addLog(`getUser success: ${data.user ? 'User found' : 'No user'}`);
        }
      }).catch(err => {
        addLog(`getUser exception: ${err.message}`);
      });
    } catch (error: any) {
      addLog(`Client creation error: ${error.message}`);
    }
  };

  const testLogin = async () => {
    try {
      const supabase = createClient();
      addLog('Attempting test login...');
      
      // Use test credentials (replace with real ones for testing)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });
      
      if (error) {
        addLog(`Login error: ${error.message}`);
      } else {
        addLog(`Login success: ${data.user?.email || 'No email'}`);
      }
    } catch (error: any) {
      addLog(`Login exception: ${error.message}`);
    }
  };

  const checkLocalStorage = () => {
    try {
      const keys = Object.keys(localStorage);
      const supabaseKeys = keys.filter(key => key.startsWith('sb-'));
      addLog(`Found ${supabaseKeys.length} Supabase keys in localStorage`);
      
      supabaseKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            addLog(`${key}: user type = ${typeof parsed.user}`);
            if (typeof parsed.user === 'string') {
              addLog(`CORRUPTION DETECTED: ${key} has user as string`);
            }
          }
        } catch (e: any) {
          addLog(`${key}: Parse error - ${e.message}`);
        }
      });
    } catch (error: any) {
      addLog(`localStorage check error: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Login Debug Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={checkLocalStorage} variant="outline">
              Check localStorage
            </Button>
            <Button onClick={clearStorage} variant="destructive">
              Clear Auth Storage
            </Button>
            <Button onClick={testClient} variant="outline">
              Test Client
            </Button>
            <Button onClick={testLogin} variant="default">
              Test Login
            </Button>
            <Button onClick={() => setLogs([])} variant="secondary">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}