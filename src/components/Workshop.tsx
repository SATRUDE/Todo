import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Goal } from "../lib/database";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  description?: string | null;
  listId?: number;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
  effort?: number;
  type?: 'task' | 'reminder';
}

interface WorkshopProps {
  onBack: () => void;
  tasks: Todo[];
  goals: Goal[];
}

export function Workshop({ onBack, tasks, goals }: WorkshopProps) {
  const [report, setReport] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load saved report and last sync time from localStorage on mount
  useEffect(() => {
    const savedReport = localStorage.getItem('workshop-report');
    const savedSyncTime = localStorage.getItem('workshop-last-sync');
    if (savedReport) {
      setReport(savedReport);
    }
    if (savedSyncTime) {
      setLastSyncTime(new Date(savedSyncTime));
    }
  }, []);

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Sanitize tasks and goals before sending (convert Date objects to strings)
      const sanitizedTasks = tasks.map(task => {
        const sanitized = { ...task };
        if (sanitized.deadline && sanitized.deadline.date instanceof Date) {
          sanitized.deadline = {
            ...sanitized.deadline,
            date: sanitized.deadline.date.toISOString().split('T')[0] // Convert to YYYY-MM-DD
          };
        }
        return sanitized;
      });

      const sanitizedGoals = goals.map(goal => ({ ...goal }));

      // Call the API endpoint
      const response = await fetch('/api/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          tasks: sanitizedTasks,
          goals: sanitizedGoals,
          reportType: 'workshop'
        }),
      });

      // Check if response has content before parsing
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (text && contentType?.includes('application/json')) {
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = text || errorMessage;
          }
        } else if (text) {
          errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response
      if (!text) {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      const reportContent = data.message || data.report || '';
      setReport(reportContent);
      const syncTime = new Date();
      setLastSyncTime(syncTime);
      // Save to localStorage
      localStorage.setItem('workshop-report', reportContent);
      localStorage.setItem('workshop-last-sync', syncTime.toISOString());
    } catch (error) {
      console.error('Error calling workshop API:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse report into sections
  const parseReportSections = (reportText: string) => {
    const sections: { title: string; content: string }[] = [];
    
    // Try to split by common section markers
    const tasksMatch = reportText.match(/##?\s*Tasks?\s*Overview?/i);
    const goalsMatch = reportText.match(/##?\s*Goals?\s*Overview?/i);
    
    if (tasksMatch && goalsMatch) {
      const tasksIndex = tasksMatch.index || 0;
      const goalsIndex = goalsMatch.index || reportText.length;
      
      if (tasksIndex < goalsIndex) {
        sections.push({
          title: 'Tasks Overview',
          content: reportText.substring(tasksIndex + tasksMatch[0].length, goalsIndex).trim()
        });
        sections.push({
          title: 'Goals Overview',
          content: reportText.substring(goalsIndex + goalsMatch[0].length).trim()
        });
      } else {
        sections.push({
          title: 'Goals Overview',
          content: reportText.substring(goalsIndex + goalsMatch[0].length, tasksIndex).trim()
        });
        sections.push({
          title: 'Tasks Overview',
          content: reportText.substring(tasksIndex + tasksMatch[0].length).trim()
        });
      }
    } else if (tasksMatch) {
      sections.push({
        title: 'Tasks Overview',
        content: reportText.substring((tasksMatch.index || 0) + tasksMatch[0].length).trim()
      });
    } else if (goalsMatch) {
      sections.push({
        title: 'Goals Overview',
        content: reportText.substring((goalsMatch.index || 0) + goalsMatch[0].length).trim()
      });
    } else {
      // If no clear sections, try to split by double newlines or other patterns
      const parts = reportText.split(/\n\s*\n/);
      if (parts.length >= 2) {
        sections.push({
          title: 'Tasks Overview',
          content: parts[0].trim()
        });
        sections.push({
          title: 'Goals Overview',
          content: parts.slice(1).join('\n\n').trim()
        });
      } else {
        // Fallback: show entire report as single section
        sections.push({
          title: 'Report',
          content: reportText.trim()
        });
      }
    }
    
    return sections;
  };

  const reportSections = report ? parseReportSections(report) : [];

  return (
    <div 
      className="relative shrink-0 w-full flex flex-col" 
      style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#110c10' }}
    >
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: '#110c10' }}>
        {/* Header */}
        <div className="content-stretch flex items-center gap-[16px] relative shrink-0 w-full px-[20px] pt-[20px] pb-[12px]">
          <div 
            className="relative shrink-0 size-[32px] cursor-pointer"
            onClick={onBack}
          >
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
              <g>
                <path 
                  d="M20 8L12 16L20 24" 
                  stroke="#E1E6EE" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                />
              </g>
            </svg>
          </div>
          <div className="content-stretch flex flex-col items-start relative shrink-0 flex-1">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">Workshop</p>
            {lastSyncTime && (
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[14px] text-[#A1A1AA] mt-[4px]">
                Last synced: {lastSyncTime.toLocaleString()}
              </p>
            )}
          </div>
          <div 
            className="relative shrink-0 cursor-pointer"
            onClick={generateReport}
            style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            <svg 
              className={`block size-[24px] ${isLoading ? 'animate-spin' : ''}`}
              fill="none" 
              preserveAspectRatio="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="#E1E6EE"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        </div>

        {/* Report Container - Scrollable */}
        <div className="flex-1 w-full flex flex-col relative min-h-0 overflow-hidden px-[20px]" style={{ backgroundColor: '#110c10' }}>
          <div className="flex-1 overflow-y-auto flex flex-col gap-[24px] pb-[20px]" style={{ WebkitOverflowScrolling: 'touch', overflowY: 'scroll' }}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-[40px]">
                <div className="flex gap-[4px] mb-[16px]">
                  <div 
                    className="w-2 h-2 bg-[#E1E6EE] rounded-full" 
                    style={{ 
                      animation: 'bounce 1.4s infinite',
                      animationDelay: '0ms'
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 bg-[#E1E6EE] rounded-full" 
                    style={{ 
                      animation: 'bounce 1.4s infinite',
                      animationDelay: '200ms'
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 bg-[#E1E6EE] rounded-full" 
                    style={{ 
                      animation: 'bounce 1.4s infinite',
                      animationDelay: '400ms'
                    }}
                  ></div>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal text-[#E1E6EE] text-[16px]">Generating report...</p>
              </div>
            ) : error ? (
              <div className="bg-[#1f2022] border border-[#2a2b2d] rounded-[12px] px-[16px] py-[12px]">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[16px] text-[#E1E6EE]">
                  {error}
                </p>
                <button
                  onClick={generateReport}
                  className="mt-[12px] bg-[rgba(225,230,238,0.1)] hover:bg-[rgba(225,230,238,0.15)] px-[16px] py-[8px] rounded-[8px] text-[#E1E6EE] text-[14px]"
                >
                  Try Again
                </button>
              </div>
            ) : reportSections.length > 0 ? (
              reportSections.map((section, index) => (
                <div key={index} className="flex flex-col gap-[12px]">
                  <h2 className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] text-[22px] text-white tracking-[-0.242px]">
                    {section.title}
                  </h2>
                  <div className="bg-[#1f2022] border border-[#2a2b2d] rounded-[12px] px-[16px] py-[16px]">
                    <p 
                      className="font-['Inter:Regular',sans-serif] font-normal leading-[1.6] text-[16px] whitespace-pre-wrap break-words"
                      style={{ color: '#A1A1AA' }}
                    >
                      {section.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#1f2022] border border-[#2a2b2d] rounded-[12px] px-[16px] py-[12px]">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[16px] text-[#E1E6EE]">
                  No report available. Click the refresh button to generate one.
                </p>
              </div>
            )}
            {/* Spacer to prevent cutoff */}
            <div className="w-full" style={{ height: '20px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
