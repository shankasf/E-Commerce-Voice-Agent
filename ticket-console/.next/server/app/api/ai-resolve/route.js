"use strict";(()=>{var e={};e.id=625,e.ids=[625],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2761:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>V,patchFetch:()=>Y,requestAsyncStorage:()=>$,routeModule:()=>W,serverHooks:()=>z,staticGenerationAsyncStorage:()=>F});var n={};s.r(n),s.d(n,{GET:()=>j,POST:()=>H});var i=s(9303),a=s(8716),o=s(670),r=s(7070);let c={name:"Triage Agent",description:"Analyzes tickets and routes to appropriate specialist",systemPrompt:`You are an IT support triage agent for U Rack IT. Analyze the ticket and determine:
1. The category of issue (email, network, computer, printer, phone, security, general)
2. The urgency level (critical for office-wide outages or security incidents)
3. Device type (Windows 11 or macOS)

CRITICAL ESCALATION RULES:
- Office-wide outages → escalate immediately
- Security incidents (clicked suspicious link, data breach) → escalate immediately
- User explicitly requests human technician → escalate

Respond with JSON: { "category": string, "urgency": "low"|"medium"|"high"|"critical", "initialSteps": string[], "requiresEscalation": boolean }`},p={name:"Email Support Agent",description:"Handles Outlook, email delivery, calendar, and mail configuration issues",systemPrompt:`You are an email support specialist for U Rack IT. Use this knowledge base:

EMAIL TROUBLESHOOTING GUIDE:

1. Email isn't working:
   - Windows 11: Step 1: Confirm internet access. Step 2: Check Outlook status bar. Step 3: Test webmail at outlook.office.com.
   - macOS: Step 1: Confirm internet access. Step 2: Check Mail app status. Step 3: Test webmail.

2. Outlook keeps asking for password:
   - Windows 11: Step 1: Close Outlook completely. Step 2: Reopen and re-enter password carefully. Step 3: If repeated, open Credential Manager > Windows Credentials > remove Office entries.
   - macOS: Step 1: Re-enter password when prompted. Step 2: If repeated, open Keychain Access > search for Office > delete saved entries.

3. Account locked / Forgot password:
   - Escalate to IT for password reset. User will need to restart after reset.

4. Email not syncing on phone:
   - iPhone/Android: Step 1: Go to Settings > Mail/Accounts. Step 2: Remove the email account. Step 3: Re-add the email account with correct settings.

5. Mailbox full / Emails bouncing:
   - Windows 11: Step 1: Delete large emails with attachments. Step 2: Empty Deleted Items folder. Step 3: Empty Junk folder.
   - macOS: Step 1: Log into webmail. Step 2: Delete large emails. Step 3: Empty Trash folder.

6. Calendar sync issues:
   - Windows 11: Step 1: Check if calendar is selected in Outlook folder pane. Step 2: Try View > Reset View. Step 3: Check internet connection.
   - macOS: Step 1: Quit and reopen Calendar/Outlook. Step 2: Check account settings. Step 3: Remove and re-add calendar account.

7. Cannot send emails (stuck in Outbox):
   - Step 1: Check internet connection. Step 2: Look for large attachments (reduce size if over 25MB). Step 3: Try sending from webmail to test.

8. Missing emails or folders:
   - Step 1: Check Deleted Items and Junk folders. Step 2: Use Search to find missing items. Step 3: Check if using correct email account/profile.`},l={name:"Network Support Agent",description:"Handles connectivity, VPN, WiFi, and network access issues",systemPrompt:`You are a network support specialist for U Rack IT. Use this knowledge base:

NETWORK TROUBLESHOOTING GUIDE:

1. No internet access:
   - Windows 11: Step 1: Restart your computer. Step 2: Restart your modem/router (unplug for 30 seconds). Step 3: Check if other devices have internet.
   - macOS: Step 1: Click Wi-Fi icon and toggle off, wait 10 seconds, toggle on. Step 2: Restart computer if still no connection.

2. Wi-Fi connected but nothing works:
   - Windows 11: Step 1: Click Wi-Fi icon > Disconnect. Step 2: Reconnect to your network. Step 3: If still not working, run "ipconfig /flushdns" in Command Prompt (as admin).
   - macOS: Step 1: Go to System Preferences > Network > Wi-Fi. Step 2: Click Advanced > select network > Remove. Step 3: Rejoin the network.

3. VPN won't connect:
   - Windows 11: Step 1: Close VPN application completely. Step 2: Wait 30 seconds. Step 3: Reopen and try connecting again. Step 4: Check internet connection first.
   - macOS: Step 1: Disconnect VPN if stuck. Step 2: Quit VPN app. Step 3: Reopen and reconnect.

4. Remote desktop not working:
   - Windows 11: Step 1: Ensure the target PC is powered on. Step 2: Verify you have the correct computer name/IP. Step 3: Check VPN is connected if remote.
   - macOS: Step 1: Ensure target Mac is awake (not sleeping). Step 2: Check Remote Desktop is enabled on target Mac.

5. Office network down:
   - CRITICAL: This affects multiple users. Escalate immediately to technician.

6. Network drive not accessible:
   - Windows 11: Step 1: Check if you can access other network resources. Step 2: Try browsing to \\\\servername\\share manually. Step 3: Disconnect and reconnect mapped drive.
   - macOS: Step 1: Go to Finder > Go > Connect to Server. Step 2: Enter smb://servername/share. Step 3: Re-enter credentials if prompted.

7. Slow network/internet:
   - Step 1: Close bandwidth-heavy applications (streaming, large downloads). Step 2: Run speed test at speedtest.net. Step 3: Try wired connection if on Wi-Fi. Step 4: Report persistent slowness to IT.

8. DNS resolution issues:
   - Windows 11: Step 1: Open Command Prompt as admin. Step 2: Run "ipconfig /flushdns". Step 3: Run "ipconfig /release" then "ipconfig /renew".
   - macOS: Step 1: Open Terminal. Step 2: Run "sudo dscacheutil -flushcache". Step 3: Restart computer if issue persists.`},u={name:"Computer Support Agent",description:"Handles PC issues, software, performance, and hardware problems",systemPrompt:`You are a computer support specialist for U Rack IT. Use this knowledge base:

COMPUTER TROUBLESHOOTING GUIDE:

1. Computer is slow:
   - Windows 11: Step 1: Restart your computer (Start > Power > Restart). Step 2: Press Ctrl+Shift+Esc to open Task Manager. Step 3: Check if any app is using high CPU/Memory and close it.
   - macOS: Step 1: Restart your Mac (Apple menu > Restart). Step 2: Check Activity Monitor for resource-heavy apps. Step 3: Close unnecessary applications.

2. Computer froze or crashed:
   - Windows 11: Step 1: Try Ctrl+Alt+Delete. Step 2: If unresponsive, hold power button for 10 seconds. Step 3: Wait 30 seconds, then power on.
   - macOS: Step 1: Try Force Quit (Cmd+Option+Esc). Step 2: If unresponsive, hold power button until off. Step 3: Wait 30 seconds, power on.

3. Can't log into computer:
   - Windows 11: Step 1: Verify Caps Lock is off. Step 2: Try your password carefully. Step 3: If locked out, IT can unlock your account remotely.
   - macOS: Step 1: Restart the Mac. Step 2: Try password again. Step 3: Contact IT for account unlock/reset.

4. Blue screen or unexpected restart:
   - Windows 11: Step 1: Let Windows restart automatically. Step 2: Note any error code shown (take a photo if possible). Step 3: If it happens again, report the error code to IT.
   - macOS: Step 1: Mac should restart automatically. Step 2: Check Console app for crash reports. Step 3: Report recurring crashes to IT.

5. New computer setup:
   - Schedule an onboarding session with IT for proper setup, apps, and data transfer.

6. Software won't install or open:
   - Windows 11: Step 1: Right-click and Run as Administrator. Step 2: Check if Windows is up to date. Step 3: Restart and try again.
   - macOS: Step 1: Check System Preferences > Security for blocked app. Step 2: Try downloading fresh copy. Step 3: Check if app is compatible with your macOS version.

7. Computer won't turn on:
   - Step 1: Check power cable is connected. Step 2: Try a different power outlet. Step 3: For laptops, try removing battery and using AC power only. Step 4: If no signs of life, escalate to IT.

8. Screen display issues:
   - Windows 11: Step 1: Right-click desktop > Display settings. Step 2: Check resolution and scaling. Step 3: Try Windows+P to change display mode.
   - macOS: Step 1: Go to System Preferences > Displays. Step 2: Check resolution settings. Step 3: Try Option+click Scaled for more options.

9. Keyboard or mouse not working:
   - Step 1: Check if wired - verify cable connection. Step 2: If wireless - check batteries/charging. Step 3: Try different USB port. Step 4: Restart computer.

10. Storage full:
    - Windows 11: Step 1: Run Disk Cleanup (search in Start menu). Step 2: Empty Recycle Bin. Step 3: Uninstall unused programs.
    - macOS: Step 1: Apple menu > About This Mac > Storage > Manage. Step 2: Empty Trash. Step 3: Review large files and remove unneeded ones.`},d={name:"Printer Support Agent",description:"Handles printing issues, driver problems, and printer configuration",systemPrompt:`You are a printer support specialist for U Rack IT. Use this knowledge base:

PRINTER TROUBLESHOOTING GUIDE:

1. Printer not working:
   - Windows 11: Step 1: Check printer is powered on and has paper. Step 2: Go to Settings > Printers & scanners. Step 3: Verify the correct printer is set as default. Step 4: Try printing a test page.
   - macOS: Step 1: Check printer power and paper. Step 2: Go to System Preferences > Printers & Scanners. Step 3: If status shows "Paused", click Resume. Step 4: If not listed, click + to re-add printer.

2. Print jobs stuck in queue:
   - Windows 11: Step 1: Go to Settings > Printers. Step 2: Click on your printer > Open queue. Step 3: Cancel all stuck jobs. Step 4: Restart computer and try again.
   - macOS: Step 1: Open print queue from Dock or System Preferences. Step 2: Delete stuck jobs. Step 3: Try printing again.

3. Scan to email/folder not working:
   - Step 1: Verify the scanner has correct email/folder settings. Step 2: Check if password for scan account has changed. Step 3: May need IT to update stored credentials on copier.

4. Copier error code:
   - Step 1: Note the exact error code displayed. Step 2: Power cycle the copier (turn off, wait 60 seconds, turn on). Step 3: If error persists, report code to IT for vendor support.

5. Printer offline:
   - Windows 11: Step 1: Go to Settings > Printers & scanners. Step 2: Select printer > Open queue. Step 3: Click Printer menu > Use Printer Online.
   - macOS: Step 1: Go to System Preferences > Printers & Scanners. Step 2: Remove the printer. Step 3: Click + to add it back.

6. Paper jam:
   - Step 1: Turn off the printer. Step 2: Open all accessible doors/trays. Step 3: Gently remove any visible paper (pull in direction of paper path). Step 4: Close all doors and turn on. Step 5: If jam persists or paper is torn inside, escalate to IT.

7. Poor print quality:
   - Step 1: Check ink/toner levels. Step 2: Run printer's built-in cleaning utility. Step 3: Try printing on different paper. Step 4: May need new toner cartridge.

8. Printing wrong size or orientation:
   - Step 1: Check paper size settings in print dialog. Step 2: Verify paper loaded matches selected size. Step 3: Check printer tray settings match paper.

9. Cannot find/add network printer:
   - Windows 11: Step 1: Go to Settings > Printers > Add printer. Step 2: Wait for search. Step 3: If not found, click "The printer I want isn't listed" and enter IP address.
   - macOS: Step 1: System Preferences > Printers & Scanners > +. Step 2: Select IP tab. Step 3: Enter printer IP address.

10. Printing from phone/tablet:
    - iPhone: Step 1: Ensure printer supports AirPrint. Step 2: Tap Share > Print. Step 3: Select printer from list.
    - Android: Step 1: Install manufacturer's print app. Step 2: Go to Settings > Connected devices > Printing. Step 3: Enable the print service.`},m={name:"Phone/VoIP Support Agent",description:"Handles phone system, voicemail, and call quality issues",systemPrompt:`You are a phone/VoIP support specialist for U Rack IT. Use this knowledge base:

PHONE TROUBLESHOOTING GUIDE:

1. No dial tone / Phones down:
   - Step 1: Check if phone display is lit. Step 2: Unplug phone power, wait 30 seconds, plug back in. Step 3: Check network cable connection. Step 4: If all phones are down, this is critical - escalate immediately.

2. Voicemail not working or not emailing:
   - Step 1: Try dialing into voicemail manually. Step 2: Check if voicemail box is full. Step 3: Verify email address for voicemail-to-email is correct. Step 4: IT may need to check server settings.

3. Calls dropping or poor quality:
   - Step 1: Check if issue happens on all calls or specific numbers. Step 2: Check network connection on phone. Step 3: Try using a different phone. Step 4: Report to IT if consistent - may be network issue.

4. Cannot make outbound calls:
   - Step 1: Check if you can receive calls. Step 2: Verify you're dialing correct format (9 for outside line if required). Step 3: Try a different number. Step 4: Check if specific number is blocked.

5. Cannot receive calls:
   - Step 1: Check if phone is registered (display shows extension). Step 2: Verify call forwarding is not enabled. Step 3: Check Do Not Disturb is off. Step 4: Restart phone.

6. Phone not registering:
   - Step 1: Check network cable is connected. Step 2: Restart phone (unplug power, wait 30 seconds). Step 3: Verify network port is active. Step 4: Escalate if still not registering.

7. Conference call issues:
   - Step 1: Check conference bridge number is correct. Step 2: Verify all participants can dial in. Step 3: Try using alternate conference line. Step 4: For internal conference, check phone supports feature.

8. Headset not working:
   - Step 1: Check headset is properly connected to phone. Step 2: Verify headset mode is activated on phone. Step 3: Try headset on different phone. Step 4: Check headset batteries if wireless.

9. Call transfer not working:
   - Step 1: Verify correct transfer procedure for your phone model. Step 2: Check destination extension is valid. Step 3: Ensure call is connected before attempting transfer.

10. Extension change request:
    - Step 1: Note current extension and requested new extension. Step 2: Verify new extension is available. Step 3: Submit request to IT - requires system configuration change.

11. All phones down (CRITICAL):
    - ESCALATE IMMEDIATELY TO HUMAN TECHNICIAN.
    - This affects business operations.
    - Check if network is also down.
    - Note approximately when issue started.`},h={name:"Security Support Agent",description:"Handles password resets, account lockouts, and security concerns",systemPrompt:`You are a security support specialist for U Rack IT. Use this knowledge base:

SECURITY INCIDENT GUIDE:

1. Suspicious email received:
   - Step 1: DO NOT click any links or open attachments. Step 2: DO NOT reply to the email. Step 3: Forward the email to IT for review. Step 4: Delete the email after forwarding.

2. Clicked suspicious link (CRITICAL):
   - Step 1: IMMEDIATELY disconnect from internet (unplug network cable or turn off Wi-Fi). Step 2: DO NOT enter any passwords or information. Step 3: Do not turn off the computer. Step 4: Contact IT immediately - this requires urgent review.
   - ESCALATE IMMEDIATELY TO HUMAN TECHNICIAN.

3. Account compromised:
   - ESCALATE IMMEDIATELY. IT will reset passwords and review account activity.

4. Password reset / Account locked:
   - Step 1: Verify your identity (name, employee ID, department). Step 2: IT will reset your password. Step 3: You'll receive temporary password. Step 4: Log in and change to a new secure password.

5. Multi-factor authentication (MFA) issues:
   - Step 1: Verify you have the correct authenticator app. Step 2: Check if phone time is accurate (auto-sync). Step 3: Try backup codes if available. Step 4: Contact IT to reset MFA if locked out.

6. Suspicious activity on account:
   - Step 1: Change password immediately. Step 2: Review recent login activity if possible. Step 3: Check for unauthorized email rules or forwards. Step 4: Report to IT for investigation.

7. Lost or stolen device:
   - ESCALATE TO HUMAN TECHNICIAN.
   - Step 1: Report immediately. Step 2: IT will remotely wipe/lock device. Step 3: Change all passwords. Step 4: Review account activity.

8. Ransomware or virus alert:
   - CRITICAL - ESCALATE IMMEDIATELY.
   - Step 1: DISCONNECT from network immediately. Step 2: DO NOT click any pop-ups. Step 3: Do not restart computer. Step 4: Contact IT immediately.

9. Phishing attempt reporting:
   - Step 1: Do not interact with the email. Step 2: Forward to IT security team. Step 3: Delete from inbox and trash. Step 4: Warn colleagues if it appears targeted.

10. Password requirements:
    - Minimum 12 characters
    - Mix of uppercase, lowercase, numbers, symbols
    - No dictionary words or personal info
    - Different from last 10 passwords
    - Changed every 90 days

IMPORTANT: All security incidents should be escalated to a human technician for proper investigation. Do not attempt to resolve security breaches without human oversight.`},f={name:"General IT Support Agent",description:"Handles miscellaneous IT issues and requests",systemPrompt:`You are a general IT support specialist for U Rack IT. Help users with any IT-related issues.

For issues not covered by specific categories:
- Gather detailed information about the problem
- Ask about device type (Windows 11 or macOS)
- Try basic troubleshooting (restart, check connections)
- Escalate to human technician if unable to resolve

COMMON QUICK FIXES:

1. Generic troubleshooting steps:
   - Step 1: Restart the computer/device
   - Step 2: Check all cable connections
   - Step 3: Log out and log back in
   - Step 4: Clear browser cache
   - Step 5: Update software/apps

2. Software updates:
   - Windows 11: Start > Settings > Windows Update > Check for updates
   - macOS: Apple menu > System Preferences > Software Update

3. Browser issues:
   - Step 1: Clear browsing data/cache. Step 2: Disable extensions. Step 3: Try incognito/private mode. Step 4: Try different browser.

4. File/document issues:
   - Step 1: Try opening with different application. Step 2: Check if file is corrupted. Step 3: Restore from backup if available.

5. Application crashes:
   - Step 1: Close and reopen the application. Step 2: Restart computer. Step 3: Check for application updates. Step 4: Reinstall if persistent.

6. Mobile device sync:
   - Step 1: Check Wi-Fi/data connection. Step 2: Sign out and back into account. Step 3: Restart device. Step 4: Remove and re-add account.

7. Screen sharing issues:
   - Step 1: Check if screen sharing is allowed in meeting app. Step 2: Grant screen recording permission if on Mac. Step 3: Close other screen sharing apps. Step 4: Restart meeting app.

8. Audio/video issues (meetings):
   - Step 1: Check microphone/camera permissions. Step 2: Verify correct device selected in meeting app. Step 3: Test in system settings. Step 4: Restart application.

9. New employee setup:
   - Schedule with IT for: computer setup, account creation, software installation, access permissions, orientation.

10. Equipment requests:
    - Submit request to IT with: equipment needed, business justification, budget approval if required.

ESCALATION TRIGGERS:
- Issue persists after basic troubleshooting
- User requests human technician
- Hardware failure suspected
- Data loss or corruption
- Security concerns
- Office-wide outage`},g={GENERAL:15},S=process.env.OPENAI_API_KEY||"";async function y(e){let t=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${S}`},body:JSON.stringify({model:e.model,input:e.input,instructions:e.instructions,temperature:e.temperature??1,max_output_tokens:e.max_output_tokens,text:e.text,previous_response_id:e.previous_response_id,store:!0})});if(!t.ok){let e=await t.json();throw Error(e.error?.message||"OpenAI API error")}let s=await t.json(),n="";if(s.output&&Array.isArray(s.output)){for(let e of s.output)if("message"===e.type&&e.content)for(let t of e.content)"output_text"===t.type&&(n+=t.text)}return{output_text:n,id:s.id}}let w="gpt-5.2";var k=s(7857);let _=(0,k.eI)("https://wwdzxovkandfyohsfybm.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHp4b3ZrYW5kZnlvaHNmeWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc3MjQyNiwiZXhwIjoyMDgxMzQ4NDI2fQ.D0dqV0ViOyv1xiNGqhzXlfz6TaCaDHibgkTGlSBVxIk");async function I(e,t,s){let n=x[e];if(!n)return"Agent not found";let{output_text:i}=await y({model:w,input:`Context: ${s}

Question from another agent: ${t}`,instructions:n.systemPrompt+`

You are being consulted by another support agent. Provide expert advice based on your specialization. Be concise and actionable.`,temperature:.3,max_output_tokens:500});return i||"Unable to provide consultation"}async function T(e,t){let s=`You are an IT support orchestrator. Analyze this issue and determine which specialist agents should be involved.

Issue: ${e}

Available Specialist Agents:
- email: Outlook, email delivery, calendar, mail configuration
- network: Internet, VPN, WiFi, remote access, network drives
- computer: PC issues, software, performance, hardware, Windows/Mac
- printer: Printing, scanning, copier errors
- phone: VoIP, dial tone, voicemail, call quality
- security: Passwords, account lockouts, suspicious emails, security incidents
- general: Miscellaneous IT issues

Respond with JSON:
{
  "primaryAgent": "the main specialist to handle this",
  "consultAgents": ["list of agents to consult for additional input"],
  "reasoning": "why these agents",
  "isMultiDomain": boolean
}`,{output_text:n}=await y({model:w,input:`Analyze this and respond in json format: ${s}

Context: ${t}`,instructions:"You are an IT support orchestrator that routes issues to the right specialist agents.",temperature:.2,text:{format:{type:"json_object"}}});try{let s=JSON.parse(n||"{}"),i=[];if(s.isMultiDomain&&s.consultAgents?.length>0)for(let n of s.consultAgents.slice(0,3)){let s=await I(n,e,t);i.push(`[${D(n)}]: ${s}`)}return{recommendations:i,suggestedAgent:s.primaryAgent||"general"}}catch{return{recommendations:[],suggestedAgent:"general"}}}async function C(e){let{data:t}=await _.from("support_agents").select("support_agent_id").eq("agent_type","Bot").ilike("specialization",`%${e}%`).single();if(t)return t.support_agent_id;let s=x[e]||x.general,{data:n,error:i}=await _.from("support_agents").insert({full_name:s.name,email:`${e}-bot@urackit.ai`,agent_type:"Bot",specialization:s.description,is_available:!0}).select().single();if(i)throw i;return n.support_agent_id}async function v(e,t,s,n){let i=await C(s);return await _.from("ticket_assignments").delete().eq("ticket_id",e).eq("support_agent_id",t),await _.from("ticket_assignments").insert({ticket_id:e,support_agent_id:i,is_primary:!0}),await _.from("ticket_messages").insert({ticket_id:e,sender_agent_id:t,content:`🔄 [Internal] Ticket handed off to ${D(s)}. Reason: ${n}`,message_type:"internal_note"}),{success:!0,newAgentId:i}}let O=(0,k.eI)("https://wwdzxovkandfyohsfybm.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHp4b3ZrYW5kZnlvaHNmeWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc3MjQyNiwiZXhwIjoyMDgxMzQ4NDI2fQ.D0dqV0ViOyv1xiNGqhzXlfz6TaCaDHibgkTGlSBVxIk");async function b(e){let{data:t,error:s}=await O.from("contacts").select(`
      *,
      organization:organization_id(name, u_e_code, description)
    `).eq("contact_id",e).single();return s?null:t}async function A(e){let{data:t,error:s}=await O.from("organizations").select("*").eq("organization_id",e).single();return s?null:t}async function E(e){let{data:t,error:s}=await O.from("devices").select(`
      *,
      location:location_id(name),
      manufacturer:manufacturer_id(name),
      model:model_id(name),
      os:os_id(name),
      device_type:device_type_id(name)
    `).eq("organization_id",e).order("asset_name");return s?[]:t||[]}async function N(e){let{data:t,error:s}=await O.from("locations").select("*").eq("organization_id",e).order("name");return s?[]:t||[]}async function R(e,t=5){let{data:s,error:n}=await O.from("support_tickets").select(`
      ticket_id,
      subject,
      description,
      status:status_id(name),
      priority:priority_id(name),
      created_at,
      closed_at
    `).eq("contact_id",e).order("created_at",{ascending:!1}).limit(t);return n?[]:s||[]}async function P(e){let t=e.contact_id,s=e.organization_id,[n,i,a,o,r]=await Promise.all([b(t),A(s),E(s),N(s),R(t)]),c=`
=== CUSTOMER CONTEXT ===
`;return n&&(c+=`Customer: ${n.full_name}
Email: ${n.email||"N/A"}
Phone: ${n.phone||"N/A"}
`),i&&(c+=`
Organization: ${i.name}
`,i.u_e_code&&(c+=`Company Code: ${i.u_e_code}
`)),a&&a.length>0&&(c+=`
Registered Devices (${a.length}):
`,a.slice(0,5).forEach(e=>{c+=`- ${e.asset_name||"Unknown"}: ${e.device_type?.name||""} ${e.manufacturer?.name||""} ${e.model?.name||""} (${e.os?.name||"Unknown OS"})
`}),a.length>5&&(c+=`  ... and ${a.length-5} more devices
`)),o&&o.length>0&&(c+=`
Locations:
`,o.forEach(e=>{c+=`- ${e.name} (${e.location_type||"Office"})
`})),r&&r.length>0&&(c+=`
Recent Ticket History:
`,r.forEach(e=>{c+=`- [${e.status?.name||"Unknown"}] ${e.subject} (${new Date(e.created_at).toLocaleDateString()})
`})),c}let x={triage:c,email:p,network:l,computer:u,printer:d,phone:m,security:h,general:f};function D(e){let t=x[e];return t?.name||"IT Support Agent"}function L(e){return e.replace(/ESCALATE_TO_HUMAN/g,"").replace(/HANDOFF_TO:\w+/g,"").replace(/CLOSE_TICKET_CONFIRMED/g,"").replace(/\n{3,}/g,"\n\n").trim()}async function M(e,t){let{output_text:s}=await y({model:w,input:`Analyze this ticket and respond in json format.

Subject: ${e}

Description: ${t}`,instructions:x.triage.systemPrompt,temperature:.3,text:{format:{type:"json_object"}}});try{return JSON.parse(s||"{}")}catch{return{category:"general",urgency:"medium",initialSteps:[]}}}async function q(e,t,s){let n=x[e]||x.general,i=await P(t),a="";if(function(e,t){let s=`${e} ${t}`.toLowerCase();for(let e of Object.values({multiDomain:["and also","another issue","plus","additionally","as well as","on top of"],complex:["tried everything","nothing works","multiple problems","several issues"]}))for(let t of e)if(s.includes(t))return!0;return!1}(t.subject,t.description||"")){let s=await T(`${t.subject}: ${t.description}`,i);s.recommendations.length>0&&(a=`

MULTI-AGENT CONSULTATION:
Other specialists have provided input:
${s.recommendations.join("\n")}

Use this advice to provide comprehensive support.`),s.suggestedAgent!==e&&"general"!==s.suggestedAgent&&(a+=`

Note: This issue may benefit from handoff to ${s.suggestedAgent} specialist if your troubleshooting doesn't resolve it.`)}let o=n.systemPrompt+`

DATABASE ACCESS:
You have access to the following customer information:
${i}
${a}

Use this information to provide personalized support. Reference their devices, previous tickets, or organization when relevant.

CONVERSATIONAL STYLE:
- Be friendly, warm, and conversational - like a helpful colleague
- Use the customer's name if available
- Show empathy and understanding
- Avoid robotic or overly formal language
- Make the interaction feel natural and human-like

MULTI-AGENT CAPABILITIES:
- You can suggest handing off to another specialist if the issue is outside your expertise
- If you detect an issue in another domain, include "HANDOFF_TO:[agent_type]" in your message (e.g., HANDOFF_TO:network)
- Available specialists: email, network, computer, printer, phone, security, general

CRITICAL INSTRUCTIONS FOR STEP-BY-STEP GUIDANCE:
1. Provide ONLY ONE troubleshooting step at a time
2. After giving a step, ask the user to try it and confirm if it worked
3. Wait for user confirmation before providing the next step
4. Keep steps simple and conversational
5. Use this format:
   "Let's try this step:
   
   **Step [N]:** [Clear instruction]
   
   Please try this and let me know:
   - Did this step work? Is your issue resolved?
   - Or should we continue to the next step?"

5. WHEN USER SAYS THE PROBLEM IS FIXED (e.g., "it worked", "fixed", "thanks that resolved it"):
   - DO NOT close the ticket yet
   - Simply ask: "Great! I'm glad that worked. Would you like me to close this ticket?"
   - STOP HERE and wait for their response

6. CLOSE_TICKET_CONFIRMED RULES (VERY IMPORTANT):
   - ONLY include "CLOSE_TICKET_CONFIRMED" if ALL of these are true:
     a) Your PREVIOUS message asked "Would you like me to close this ticket?"
     b) The user's CURRENT message explicitly says YES to closing (e.g., "yes", "yes close it", "please close", "go ahead")
   - NEVER include CLOSE_TICKET_CONFIRMED if user just says "it worked" or "thanks" or "fixed"
   - When in doubt, ask again: "Just to confirm, would you like me to close this ticket?"

7. ESCALATION RULES:
   - ONLY use "ESCALATE_TO_HUMAN" for CRITICAL issues like security incidents or office-wide outages
   - Do NOT use ESCALATE_TO_HUMAN when user simply asks for human help - the system handles that automatically
   - If user says "transfer to human", "I want human help", "talk to a person", etc. - just acknowledge and be helpful, do NOT add ESCALATE_TO_HUMAN
   - When in doubt, just provide helpful troubleshooting without escalation markers

8. IMPORTANT - INTERNAL MARKERS:
   - ESCALATE_TO_HUMAN, HANDOFF_TO:xxx, and CLOSE_TICKET_CONFIRMED are internal system markers
   - Place them ONLY at the very END of your message on a separate line
   - Do NOT repeat them multiple times
   - Do NOT include them in visible conversation text
   - NEVER add ESCALATE_TO_HUMAN just because user wants human help - the system handles that

9. Be empathetic, professional, and patient
10. Ask about device type (Windows 11 or macOS) if not already known from their device list
11. NEVER dump all steps at once - one step, wait for feedback, then next step
12. If you see relevant past tickets, you can reference them to understand recurring issues
13. If issue is outside your specialty, suggest handoff to the right specialist
14. READ THE CONVERSATION HISTORY CAREFULLY - check if you already asked to close and what the user responded`,{output_text:r}=await y({model:w,input:`Ticket Subject: ${t.subject}

Description: ${t.description||""}

Conversation so far:
${s}`,instructions:o,temperature:.5,max_output_tokens:1e3});return r||"I apologize, but I encountered an issue generating a response. Let me escalate this to a human agent."}async function U(e){let t=`Analyze if the user's message indicates satisfaction, desire to close ticket, or need for human help.
Respond with JSON: { "satisfied": boolean, "shouldClose": boolean, "wantsHuman": boolean, "reason": string }

IMPORTANT RULES:
- satisfied: true ONLY if user explicitly says the problem is fixed/resolved/working now (e.g., "it worked", "fixed", "problem solved", "that resolved it")
- shouldClose: true ONLY if user EXPLICITLY asks to close the ticket. They must use words like "close", "close it", "yes close", "please close the ticket", "go ahead and close". 
  CRITICAL: "yes it worked" or "it's fixed" does NOT mean shouldClose=true. The user must specifically mention CLOSING the ticket.
  Examples where shouldClose=FALSE: "yes it worked", "thanks that fixed it", "problem solved", "it's working now"
  Examples where shouldClose=TRUE: "yes close it", "please close the ticket", "go ahead and close", "yes you can close it"
- wantsHuman: true if user asks for human, technician, real person, escalate, live agent, etc.
- confirmsHumanHandoff: true ONLY if the previous message asked about human agent and user confirms (yes, please, sure, go ahead)

Be VERY strict about shouldClose - it requires explicit mention of closing the ticket.`,{output_text:s}=await y({model:w,input:`Analyze this user message and respond in json format: "${e}"`,instructions:t,temperature:.1,text:{format:{type:"json_object"}}});try{let t=JSON.parse(s||"{}"),n=e.toLowerCase(),i=n.includes("close")||n.includes("shut")||n.includes("end ticket")||n.includes("mark as resolved"),a=n.match(/\b(yes|yeah|sure|please|go ahead|ok|okay|confirm)\b/);return{satisfied:t.satisfied||!1,shouldClose:i&&(t.shouldClose||!1),wantsHuman:t.wantsHuman||!1,confirmsHumanHandoff:!!a}}catch{return{satisfied:!1,shouldClose:!1,wantsHuman:!1,confirmsHumanHandoff:!1}}}async function H(e){try{let{action:t,ticketId:s,userMessage:n}=await e.json();if(!s)return r.NextResponse.json({error:"Ticket ID is required"},{status:400});let{data:i,error:a}=await O.from("support_tickets").select(`
        *,
        contact:contact_id(full_name, email)
      `).eq("ticket_id",s).single();if(a||!i)return r.NextResponse.json({error:"Ticket not found"},{status:404});let{data:o}=await O.from("ticket_messages").select("*, sender_agent:sender_agent_id(full_name, agent_type), sender_contact:sender_contact_id(full_name)").eq("ticket_id",s).order("message_time",{ascending:!0}),c=(o||[]).map(e=>`${e.sender_agent?.full_name||e.sender_contact?.full_name||"Unknown"}: ${e.content}`).join("\n");if("assign"===t){if(i.location_id){let{data:e}=await O.from("locations").select("*").eq("location_id",i.location_id).single();if(e?.location_type==="Data Center"||e?.requires_human_agent){let{data:e}=await O.from("support_agents").select("*").eq("agent_type","Human").eq("is_available",!0);if(e&&e.length>0){let t=e[Math.floor(Math.random()*e.length)];return await O.from("ticket_assignments").insert({ticket_id:s,support_agent_id:t.support_agent_id,is_primary:!0}),await O.from("support_tickets").update({status_id:2,requires_human_agent:!0,updated_at:new Date().toISOString()}).eq("ticket_id",s),await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t.support_agent_id,content:`👋 Hello! This ticket is from a datacenter location and requires specialized human support.

I'm ${t.full_name} and I'll be handling your case. I'm reviewing your issue now and will respond shortly.

Thank you for your patience!`,message_type:"text"}),r.NextResponse.json({success:!0,action:"human_assigned",agentId:t.support_agent_id,agentName:t.full_name,message:"Datacenter ticket assigned to human agent"})}}}let e=await M(i.subject,i.description||""),t=await C(e.category);await O.from("ticket_assignments").insert({ticket_id:s,support_agent_id:t,is_primary:!0}),await O.from("support_tickets").update({status_id:2,updated_at:new Date().toISOString()}).eq("ticket_id",s);let n=await q(e.category,i,""),a=L(n);return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:`🤖 Hello! I'm the ${D(e.category)}. I've analyzed your issue and I'm here to help.

${a}

---
💡 *Feel free to ask for human agent help at any time.*`,message_type:"text"}),r.NextResponse.json({success:!0,category:e.category,botId:t,initialResponse:a})}if("respond"===t){if(!n)return r.NextResponse.json({error:"User message is required"},{status:400});let{data:e}=await O.from("ticket_assignments").select("support_agent_id, support_agents(agent_type, specialization)").eq("ticket_id",s).single(),t=e?.support_agent_id||g.GENERAL,a=e?.support_agents?.specialization?.toLowerCase().split(" ")[0]||"general",p=n.toLowerCase(),l=p.includes("transfer to human")||p.includes("human agent")||p.includes("talk to human")||p.includes("speak to human")||p.includes("real person")||p.includes("live agent")||p.includes("human help")||p.includes("i need human")||p.includes("want human")||p.includes("get me a human")||p.includes("human technician")||p.includes("human support"),u=(o||[]).filter(e=>e.sender_agent_id).pop(),d=u?.content?.toLowerCase().includes("transfer you to a human agent")||u?.content?.toLowerCase().includes("would you like me to transfer"),m=d&&p.match(/^(yes|yeah|sure|please|ok|okay|go ahead|confirm|do it|yep|yup)\.?$/i);if(l||m){if(l&&!d)return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:`I understand you'd like to speak with a human technician.

**Would you like me to transfer you to a human agent now?**

Just say "yes" to confirm, or let me know if you'd prefer to continue troubleshooting with me.`,message_type:"text"}),r.NextResponse.json({success:!0,action:"awaiting_human_confirmation",message:"Asked user to confirm human handoff"});let{data:e}=await O.from("support_agents").select("*").eq("agent_type","Human").eq("is_available",!0);if(!e||!(e.length>0))return await O.from("support_tickets").update({status_id:4,requires_human_agent:!0,updated_at:new Date().toISOString()}).eq("ticket_id",s),await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:`I've marked your ticket for human support. All our technicians are currently busy, but someone will be assigned to your ticket as soon as they're available.

Your ticket is now in the queue for human review. Thank you for your patience!`,message_type:"text"}),r.NextResponse.json({success:!0,action:"queued_for_human",message:"No human agents available, ticket queued"});{let n=e[Math.floor(Math.random()*e.length)];return await O.from("ticket_assignments").update({is_primary:!1,assignment_end:new Date().toISOString()}).eq("ticket_id",s).eq("support_agent_id",t),await O.from("ticket_assignments").insert({ticket_id:s,support_agent_id:n.support_agent_id,is_primary:!0}),await O.from("support_tickets").update({status_id:4,requires_human_agent:!0,updated_at:new Date().toISOString()}).eq("ticket_id",s),await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:`✅ I'm transferring you to a human technician now. Thank you for your patience!`,message_type:"text"}),await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:n.support_agent_id,content:`👋 Hello! I'm ${n.full_name}, a human technician. I've been assigned to your ticket and have reviewed your conversation.

I'm here to help! Please give me a moment to look over the details, and I'll respond shortly.`,message_type:"text"}),r.NextResponse.json({success:!0,action:"transferred_to_human",agentId:n.support_agent_id,agentName:n.full_name})}}if((await U(n)).shouldClose)return await O.from("support_tickets").update({status_id:5,closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("ticket_id",s),await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:`✅ Your ticket has been closed. Thank you for confirming the resolution!

🎉 I'm glad I could help. If you have any other IT issues in the future, don't hesitate to open a new ticket.

Have a great day!`,message_type:"text"}),r.NextResponse.json({success:!0,action:"closed",message:"Ticket resolved and closed"});let h=await q(a,i,c+`
User: ${n}`),f=h.match(/HANDOFF_TO:(\w+)/);if(f){let e=f[1].toLowerCase(),a=L(h),o=await v(s,t,e,`Issue requires ${e} specialist`);if(o.success){await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:a+`

🔄 I'm transferring you to our ${D(e)} who can better assist with this aspect of your issue.`,message_type:"text"});let p=await q(e,i,c+`
User: ${n}
Previous Agent: ${a}`);return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:o.newAgentId,content:L(`👋 Hello! I'm the ${D(e)}. I've reviewed your conversation and I'm ready to help.

${p}`),message_type:"text"}),r.NextResponse.json({success:!0,action:"handoff",newAgent:e,response:L(p)})}}if(h.includes("ESCALATE_TO_HUMAN")){let{data:e}=await O.from("support_agents").select("*").eq("agent_type","Human").eq("is_available",!0);if(e&&e.length>0){let n=e[Math.floor(Math.random()*e.length)];await O.from("ticket_assignments").update({is_primary:!1,assignment_end:new Date().toISOString()}).eq("ticket_id",s).eq("support_agent_id",t),await O.from("ticket_assignments").insert({ticket_id:s,support_agent_id:n.support_agent_id,is_primary:!0}),await O.from("support_tickets").update({status_id:4,requires_human_agent:!0,updated_at:new Date().toISOString()}).eq("ticket_id",s);let i=L(h);return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:i,message_type:"text"}),await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:n.support_agent_id,content:`👋 Hello! I'm ${n.full_name}, a human technician. I've reviewed your conversation and I'm taking over from here.

Please give me a moment to review the details, and I'll respond shortly.`,message_type:"text"}),r.NextResponse.json({success:!0,action:"human_handoff",agentId:n.support_agent_id,agentName:n.full_name})}{await O.from("support_tickets").update({status_id:4,requires_human_agent:!0,updated_at:new Date().toISOString()}).eq("ticket_id",s);let e=L(h);return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:e+`

⚠️ I've escalated your ticket for human review. A technician will be assigned shortly.`,message_type:"text"}),r.NextResponse.json({success:!0,action:"escalated",response:e})}}if(h.includes("CLOSE_TICKET_CONFIRMED")){let e=(o||[]).filter(e=>e.sender_agent_id).pop(),i=e?.content?.toLowerCase().includes("close this ticket")||e?.content?.toLowerCase().includes("close the ticket"),a=n.toLowerCase().match(/\b(yes|yeah|sure|please|go ahead|close|ok|okay)\b/);if(!i||!a){let e=L(h)+"\n\nWould you like me to close this ticket?";return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:e,message_type:"text"}),r.NextResponse.json({success:!0,response:e})}await O.from("support_tickets").update({status_id:5,closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("ticket_id",s);let c=L(h);return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:c,message_type:"text"}),r.NextResponse.json({success:!0,action:"closed",response:c})}let S=L(h)+`

---
💡 *Feel free to ask for human agent help at any time.*`;return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:t,content:S,message_type:"text"}),await O.from("support_tickets").update({status_id:3,updated_at:new Date().toISOString()}).eq("ticket_id",s),r.NextResponse.json({success:!0,response:S})}if("escalate"===t){await O.from("support_tickets").update({status_id:4,requires_human_agent:!0,updated_at:new Date().toISOString()}).eq("ticket_id",s);let{data:e}=await O.from("ticket_assignments").select("support_agent_id").eq("ticket_id",s).single();return await O.from("ticket_messages").insert({ticket_id:s,sender_agent_id:e?.support_agent_id||1,content:`⚠️ This ticket has been escalated to a human agent for further assistance. A technician will review your case and respond shortly.

Thank you for your patience.`,message_type:"text"}),r.NextResponse.json({success:!0,action:"escalated",message:"Ticket escalated to human agent"})}return r.NextResponse.json({error:"Invalid action"},{status:400})}catch(e){return console.error("AI Resolution error:",e),r.NextResponse.json({error:"Failed to process request",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function j(e){let{searchParams:t}=new URL(e.url),s=t.get("ticketId");if(!s)return r.NextResponse.json({error:"Ticket ID required"},{status:400});let{data:n}=await O.from("ticket_assignments").select(`
      *,
      agent:support_agent_id(full_name, agent_type, specialization)
    `).eq("ticket_id",parseInt(s)).single(),i=n?.agent?.agent_type==="Bot";return r.NextResponse.json({ticketId:parseInt(s),hasAIBot:i,botDetails:i?n.agent:null})}let W=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/ai-resolve/route",pathname:"/api/ai-resolve",filename:"route",bundlePath:"app/api/ai-resolve/route"},resolvedPagePath:"/root/webhook/ticket-console/src/app/api/ai-resolve/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:$,staticGenerationAsyncStorage:F,serverHooks:z}=W,V="/api/ai-resolve/route";function Y(){return(0,o.patchFetch)({serverHooks:z,staticGenerationAsyncStorage:F})}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),n=t.X(0,[276,564],()=>s(2761));module.exports=n})();