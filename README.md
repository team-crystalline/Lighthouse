# Lighthouse 1.0

Lighthouse is a plural tool for folks to track their alters, systems, and get access to resources. Built with ExpressJS, using EJS for templating and PostgreSQL for the database. With the recent shutdown of Simply Plural, Lighthouse's code is now being made public for the community to use and keep options alive for plural folks.

Developers of any skill level are welcome to join.

## A quick "Constitution" for Lighthouse
1. Personally Identifiable Information (PII) needs to be a bare minimum. Our userbase, while not exclusively, is made up of people who are vulnerable, in actively abusive situations, or are otherwise at risk. We want to minimize the amount of information that could be used to identify or locate our users. If your feature needs a name, an address, a demographic or a form of payment information, it will be rejected immediately.
2. Inclusivity needs to be a foundation in everything Lighthouse has. Not every plural system is the same. Some have no memories of trauma. Some have lots. Some have none at all. If someone has decided that Lighthouse will help them, we as the community are not in a position to deny that. 
3. ***Do not vibe code your features for Lighthouse.*** Security remains a risk with LLM-generated code, as well as copyright issues (it's still not decided who owns LLM-generated code). If we suspect LLM-generated code, we will ask you for understanding of the code and how it works. If you cannot provide that, your code will be rejected.  There are two files, an AGENTS.md file and a CLAUDE.md file, to make sure that any agents you have adhere to this rule. **Do not modify these files.** If edits to these files are found in your pull request, your code will be rejected immediately without review.
4. Donations for now will not be accepted, since it'll get dicey about where the money goes. For now, Lighthouse will be paid for by The Lighthouse System. If donations become necessary, we'll probably appoint someone to handle the money and make it clear we're using the funds for what they're meant for.

## Set Up and Installation
Setting up Lighthouse is fairly straightforward. 

1. Clone the repository to your local machine.
2. Install all dependencies using `npm install`.
3. Create a `.env` file in the root directory. Add the following environment variables:
    - `ADMIN_EMAIL`: Your email that will be sending all email to users, including password reset emails.
    - `gmail_pass`: The app password for the account. Might work without gmail!
    - `URL_PREFIX`: The url for your project. Your dev environment should have this set to `localhost`, while your hosted instance will have the URL (like `www.example.com`)
    - `CLOUDFLARE_KEY`: Optional. For if you want to protect signups on your instance.
    - `LOG_EMAIL`: true/false for logging the email html to the console for debugging.
    - `cryptkey`: The key used for encrypting sensitive data. This should be a long, random string.
    - `DB_HOST`: The host of your PostgreSQL database.
    - `DB_USER`: The username for your PostgreSQL database.
    - `DB_PASS`: The password for your PostgreSQL database.
    - `DB_PORT`: The port for your PostgreSQL database.
    - `DB_NAME`: The name of your PostgreSQL database.
    - `dev1`, `dev2`, `dev3`: The IDs of users who should have access to development features (optional).
    - `environment`: Set this to `dev`. Wherever you host your instance, the instance itself should have this set to `prod`.
    - `maintenance`: Set this to false. Not entirely necessary, because you probably won't need to put the site in maintenance mode on the dev environment, but it's here since you might see it in the code and wonder what it does.
    - `sec`: Secret for session management. This should also be a long, random string.
    - `PORT`: The port you want the server to run on.
    - `SALT_KEY`: This is a key we use to encrypt the salt for password hashing. Now, you might be thinking "This is a bit overkill", and it is. Like I've said in the past: Paranoia is a wonderful motivator for this project.
4. Set up your PostgreSQL database using the provided SQL schema in the `local-db` folder. There's a README in that folder with more instructions, if you need that.
5. Finally, you can run the server using `npm start`. When Lighthouse boots, it will provide you with an "Open in browser" link. Click that, and you should be good to go!

## What needs done immediately
### Cleanup. Lots and lots of cleanup.
The code, as you will quickly see, is just a mess. This code is in dire need of cleanup. There needs to be a helper function file to reduce redundancy, the routes still need to be organized into separate files, and queries need to use the new await db.query call which handles all the errors and whatnot. 

This project was built all the way back in 2021, when I was still fresh out of an Associates Degree program and had only been coding for a few months. That's why there's so much callback hell, redundant code and a general lack of organisation. This doesn't mean the data itself is unsafe! It's just that the backend is like the side of cross-stitch that you don't show people.

### Login issues
This one is still baffling me. For some reason, changing passwords has become a problem. Sign ups might also be broken when registering. Why that's happening is beyond me, as I've tested it repeatedly and have not been able to replicate the issue. I get a sneaking suspicion that we'll only get answers once cleanup is done. While sign ups are disabled, let's focus on cleaning up the code and making sure we understand how everything works. Once we do that, we can probably figure out what's going on with the login issues.

### Screen reader accessibility
I've been emailed a couple times about how screenreaders cannot navigate Lighthouse. I don't have a screen reader myself, so I haven't been able to test this. Once the sign up and clean up issues are resolved, this should be our next priority.

### API access
I really want to be sure people can't make random CURL commands to this project's API and start pulling data. I think I have an ok system in place to prevent that, but I want to make sure it's solid.

### Safety Plan Export
Currently we store those PDFs for 5 minutes, but if the program crashes in that 5 minute window, they might get left on the server. We need to make sure that doesn't happen. Now that I know how to send blobs in a response, that's how we should be doing it instead of storing them on the server at all. Just stream the PDF info directly to the user. Saves space and makes it more secure.

### Reduce the POST, DELETE, PUT request redirects.
We can use use a fetch on the front end and when it gets a response, redirect or alert the users.

Also! Updates to data like updating alters, systems, etc should be PUT requests, not POST. POST = create, PUT = update, GET= read, DELETE = delete.