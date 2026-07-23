<!-- first thing to do si the 
ci /cd workflow complete it i is only the github it should be done early  -->

make the changes in the first sync regarding the new tables and all first the logs one commits to the push takes the push_id for the 

done above part now the showing part the main page where it requires the event timeline  form the events i can take by time and show three things to show one dot wiht the colour thnet he description adn the time 


secondly then if you get hte depployment then go to the loki/promethues/tempo for the logs metrics traces this will be ultimate thing ;


main phase above now the smaller part below
for the ci/cd part now the main thing to do 
fist sync will only add the default branch 
if you want you can add the other brranches then if added there last five commits will come then if it creates the pr  then to default branch then ci part will work there data logs will come status will be showed in the ci/cd part then if completed then the "pr will be ready to be merged" this log will come int he logs part then the cd part will start there logs and if failed the 

this part i think requires much time i think first i will do the workflow done perfect then i will add the incident thing 

incident will be create 


after this the phase 2 will began now the phase 1 should be completed as soon as poosible

Job Names are Dynamic: Instead of saying "Build Started" for everything, it will say "Test Started" if the job name is "Test" or "Lint Started" if the job name is "Lint."
State Management: By saving job_queued, you can show a "spinner" or a gray icon on your dashboard immediately, before the build even starts.
Color Coding: I added level: "SUCCESS" and level: "WARNING" so your frontend can color the messages (Green for success, Yellow for cancelled, Red for failed).
BigInt Support: The workflow_job_id is saved as the GitHub ID so you can avoid duplicate event entries if the same webhook is sent twice.


3. Services Page (The "Health Map")
This is the high-level view of your repositories table.
What to keep:
Health Score: Aggregated percentage of successful vs failed runs.
Dependencies: If Service A relies on Service B.
Active Alerts: Any "Incident" currently linked to this service.
How to show it: Use Grid Cards (like your Repository cards but bigger). Each card should have a small "Sparkline" (mini graph) showing the last 10 build statuses.



