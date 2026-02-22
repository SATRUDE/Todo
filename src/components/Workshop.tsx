import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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
  type?: 'task' | 'reminder';
}

interface WorkshopProps {
  onBack: () => void;
  tasks: Todo[];
}

export function Workshop({ onBack, tasks }: WorkshopProps) {
  const [report, setReport] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load saved Tasks Overview report and last sync time from localStorage on mount
  useEffect(() => {
    const savedTasksReport = localStorage.getItem('workshop-tasks-report');
    const savedSyncTime = localStorage.getItem('workshop-last-sync');
    
    if (savedTasksReport) {
      const tasksSection = `## Tasks Overview\n\n${savedTasksReport}`;
      setReport(tasksSection);
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
        const sanitized: any = { ...task };
        if (sanitized.deadline && sanitized.deadline.date instanceof Date) {
          // Convert Date to YYYY-MM-DD format using local timezone (not UTC)
          const date = sanitized.deadline.date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          
          sanitized.deadline = {
            ...sanitized.deadline,
            date: dateString as any // Convert to YYYY-MM-DD using local timezone
          };
        }
        return sanitized;
      });

      // Call the API endpoint
      const response = await fetch('/api/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          tasks: sanitizedTasks,
          goals: [],
          reportType: 'workshop',
          sectionType: 'tasks'
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
      
      // Extract Tasks Overview
      const tasksMatch = reportContent.match(/##\s*Tasks?\s*Overview?\s*\n([\s\S]*?)(?=##\s*Goals?\s*Overview|$)/i);
      const tasksContent = tasksMatch ? tasksMatch[1].trim() : reportContent.trim();
      
      // Set report with Tasks Overview only
      const tasksSection = `## Tasks Overview\n\n${tasksContent}`;
      setReport(tasksSection);
      
      // Save Tasks Overview
      if (tasksContent) {
        localStorage.setItem('workshop-tasks-report', tasksContent);
        const syncTime = new Date();
        setLastSyncTime(syncTime);
        localStorage.setItem('workshop-last-sync', syncTime.toISOString());
      }
    } catch (error) {
      console.error('Error calling workshop API:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse Tasks Overview into grouped insight sections
  // Returns array of sections, each with a title and array of insight texts
  const parseTasksInsights = (tasksContent: string): { title: string; insights: string[] }[] => {
    const sections: { title: string; insights: string[] }[] = [];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:entry',message:'Starting parseTasksInsights',data:{tasksContentLength:tasksContent.length,tasksContentPreview:tasksContent.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Split by markdown headings (###)
    const headingSections = tasksContent.split(/(?=###\s+)/);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:sections',message:'Split into heading sections',data:{sectionCount:headingSections.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    for (const section of headingSections) {
      const trimmed = section.trim();
      if (!trimmed || trimmed.length < 10) continue;
      
      // Check for ### heading
      const headingMatch = trimmed.match(/^###\s+(.+?)(?:\n|$)/);
      if (headingMatch) {
        const title = headingMatch[1].trim();
        let content = trimmed.replace(/^###\s+.+?\n?/, '').trim();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:foundHeading',message:'Found heading section',data:{title,contentLength:content.length,contentPreview:content.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Remove any repeated title variations (like "asks Due Today" or malformed titles)
        content = content.replace(/^asks\s+Due\s+Today.*?-\s*/i, '');
        content = content.replace(/^asks\s+Due\s+Tomorrow.*?-\s*/i, '');
        content = content.replace(/^asks\s+Due\s+This\s+Week.*?-\s*/i, '');
        content = content.replace(/^Tasks\s+Due\s+Today.*?-\s*/i, '');
        content = content.replace(/^Tasks\s+Due\s+Tomorrow.*?-\s*/i, '');
        content = content.replace(/^Tasks\s+Due\s+This\s+Week.*?-\s*/i, '');
        
        // Split content into lines
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:splitLines',message:'Split content into lines',data:{lineCount:lines.length,firstFewLines:lines.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Find where insights start (bullet points starting with "-" that are NOT tasks)
        let insightsStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // If line starts with "-" and doesn't contain task markers like [Due:], it's an insight
          if (line.startsWith('-') && !line.includes('[Due:') && !line.match(/^\d+\./)) {
            insightsStartIndex = i;
            break;
          }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:foundInsights',message:'Found insights start index',data:{insightsStartIndex,hasInsights:insightsStartIndex >= 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        if (insightsStartIndex >= 0) {
          // Extract only the insights (bullet points)
          const insightLines = lines.slice(insightsStartIndex);
          const insightsText = insightLines.join('\n');
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:extractedInsights',message:'Extracted insights text',data:{insightsTextLength:insightsText.length,insightsTextPreview:insightsText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (insightsText.trim().length > 0) {
            // Split insights by lines starting with "-" to get individual insights
            const individualInsights = insightsText.split(/\n(?=-)/).map(insight => {
              // Remove leading "- " and clean up whitespace
              return insight.replace(/^-\s*/, '').trim();
            }).filter(insight => insight.length > 10);
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:individualInsights',message:'Created individual insights',data:{insightCount:individualInsights.length,insights:individualInsights.map(i => i.substring(0,50))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            // Group all insights under this section title
            if (individualInsights.length > 0) {
              sections.push({
                title: title,
                insights: individualInsights
              });
            }
          }
        } else if (content.length > 20) {
          // Fallback: if no clear insights section, use the whole content as a single insight
          sections.push({ title, insights: [content] });
        }
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:parseTasksInsights:return',message:'Returning parsed sections',data:{sectionCount:sections.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return sections.length > 0 ? sections : [{ title: 'Tasks Overview', insights: [tasksContent] }];
  };

  // Parse report into sections
  const parseReportSections = (reportText: string) => {
    const sections: { title: string; content: string; insights?: { title: string; insights: string[] }[] }[] = [];
    
    // Try to split by common section markers
    const tasksMatch = reportText.match(/##?\s*Tasks?\s*Overview?/i);
    const goalsMatch = reportText.match(/##?\s*Goals?\s*Overview?/i);
    
    let tasksContent = '';
    let goalsContent = '';
    
    if (tasksMatch && goalsMatch) {
      const tasksIndex = tasksMatch.index || 0;
      const goalsIndex = goalsMatch.index || reportText.length;
      
      if (tasksIndex < goalsIndex) {
        tasksContent = reportText.substring(tasksIndex + tasksMatch[0].length, goalsIndex).trim();
        goalsContent = reportText.substring(goalsIndex + goalsMatch[0].length).trim();
      } else {
        goalsContent = reportText.substring(goalsIndex + goalsMatch[0].length, tasksIndex).trim();
        tasksContent = reportText.substring(tasksIndex + tasksMatch[0].length).trim();
      }
    } else if (tasksMatch) {
      tasksContent = reportText.substring((tasksMatch.index || 0) + tasksMatch[0].length).trim();
    } else if (goalsMatch) {
      goalsContent = reportText.substring((goalsMatch.index || 0) + goalsMatch[0].length).trim();
    } else {
      // If no clear sections, try to split by double newlines or other patterns
      const parts = reportText.split(/\n\s*\n/);
      if (parts.length >= 2) {
        tasksContent = parts[0].trim();
        goalsContent = parts.slice(1).join('\n\n').trim();
      } else {
        // Fallback: show entire report as single section
        sections.push({
          title: 'Report',
          content: reportText.trim()
        });
        return sections;
      }
    }
    
    // Parse Tasks Overview into insights
    if (tasksContent) {
      const tasksInsights = parseTasksInsights(tasksContent);
      sections.push({
        title: 'Tasks Overview',
        content: tasksContent,
        insights: tasksInsights
      });
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
                  {section.insights && section.insights.length > 0 ? (
                    // Render grouped insight sections for Tasks Overview
                    <div className="flex flex-col gap-[12px]">
                      {section.insights.map((insightSection, sectionIndex) => (
                        <div 
                          key={sectionIndex} 
                          className="bg-[#1f2022] border border-[#2a2b2d] rounded-[12px] px-[16px] py-[16px]"
                        >
                          <h3 className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] text-[18px] text-white tracking-[-0.198px] mb-[12px]">
                            {insightSection.title}
                          </h3>
                          <ul className="flex flex-col gap-[8px] list-none pl-0">
                            {insightSection.insights.map((insight, insightIndex) => (
                              <li 
                                key={insightIndex}
                                className="flex items-start gap-[8px]"
                              >
                                <span className="text-white mt-[4px] shrink-0">•</span>
                                <p 
                                  className="font-['Inter:Regular',sans-serif] font-normal leading-[1.6] text-[16px] break-words flex-1"
                                  style={{ color: '#A1A1AA' }}
                                >
                                  {insight}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Fallback: Render as single block if no insights parsed
                    <div className="bg-[#1f2022] border border-[#2a2b2d] rounded-[12px] px-[16px] py-[16px]">
                      <p 
                        className="font-['Inter:Regular',sans-serif] font-normal leading-[1.6] text-[16px] whitespace-pre-wrap break-words"
                        style={{ color: '#A1A1AA' }}
                      >
                        {section.content}
                      </p>
                    </div>
                  )}
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
