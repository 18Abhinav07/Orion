have uploaded a file called MIGRATION.md & DOCS.md which outlines our strategy to convert this application from a "Real Estate on Flow" dApp to an "IP-OPS on Story Protocol" dApp.

STOP. Do not start coding yet.

First, I need you to perform a deep Migration Analysis of my current codebase to ensure you understand the "Bypass Strategy" completely.

Please analyze the following files specifically:

newissuerdash (The Upload Page)

dashboard (The User Home)

marketplace (The Listing Page)

admin (The Governance Page)

After analyzing, please present a "Migration Plan" for my review that includes:

1. The Variable Mapping Table For each of the 4 pages above, list the current Real Estate variable names (e.g., sqft, propertyType, monthlyRent) and mapped them to the new IP-OPS variable names (e.g., fileHash, royaltyPercent).

2. The "Kill List" Identify exactly which imports and function calls need to be removed/bypassed. (e.g., "In newissuerdash, lines 12-15 importing fcl and line 85 calling mintProperty will be removed").

3. The Service Layer Stub Write out the pseudocode or empty function signatures for the new services/storyService.ts file. Show me exactly what arguments these functions will take so I can verify they match the Story Protocol SDK requirements.

4. The Page Flow Confirmation Explain in plain English how you will redirect the "Buy" button on the Marketplace page. Currently, it likely triggers a Flow transaction. Explain what it will trigger in the new version.

Wait for my explicit "YES" on this plan before you generate any actual implementation code.