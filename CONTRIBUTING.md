# Contributing to Lighthouse

Lighthouse is an open source project, and we welcome contributions from the community. If you would like to contribute, please follow these guidelines:

## How to Contribute

1. Fork the repository and create a new branch for your feature or bug fix. Make sure your fork is synced with the main respository! This will make it easier for your feature to be merged in. Make sure your branch is named something relevant to your contribution, like `FOUC-hotfix` or `alter-inboxes`. You can add your name to the branch if you would like, but you're not required to.
1. Make sure your code follows the existing style and conventions of the project. This will be outlined later in this page.
1. **Please do not vibe code your contributions.** We expect understanding of the code you submit. We understand that some IDEs have auto-complete features, but apps such as Codex, Claude Code, and other AI code generators are not welcome on this project. If we see that AGENTS.md or CLAUDE.md have been tampered with or deleted, we will know that you have used an AI code generator and your contribution will be rejected immediately without comment. Repeat offenders will be banned from contributing to the project, and potentially to all Team Crystalline projects.

Folks of all skill levels are encouraged to add to the project. If you are new to open source, we recommend starting with a small issue or feature. You can find issues labeled "starter issue" or "starter bug" in our issue tracker! **Any feature or bug fix requiring changes to the database should be discussed with EscapeToTheCity/The Lighthouse System before being worked on.** He will be able to update the live database and the .sql file in the repo with the necessary changes.

## Testing

Right now, Lighthouse does not have automated tests. We don't like that either. Until those are set up, we ask that you manually test your features, as thoroughly as you can (otherwise called guerilla testing). When we get an automated testing suite set up, we will update this section with instructions on how to run the tests. Thanks for your patience!

## Features That Will Not Be Accepted

We love to see the creativity of the community, but there are some features that will not be accepted into the project.

### Social Features

We don't want to create a platform that encourages socialising on a place that is built to be a walled garden. Features that would fall into this category would be things like friend lists, messages, sharable links to alters/systems/journals, front broadcasting, or any other feature that might allow a user to communicate in some way with another user. Another reason we will reject these features is that there's a level of liability and moderation that comes with allowing users to communicate.

Note: Front tracking does **not** count as a social feature, as long as it is for the user themselves to see.

### Gate-keeping Features

This is pertaining to "syscourse", which is discourse in the plural community. This is primarily arguments about who is and isn't a system, what is and isn't plurality, introjects, etc. We would like to keep our "minimal controversy" streak going, so we ask that your opinions on these topics be left at the door (don't include it in your features or bug fixes). At the end of the day, Lighthouse is a place for you to be reflecting on your own, so there's no need to be bringing that kind of thing into the app. It's also banned in our Discord server, so you should already be used to leaving it at the door!

No matter the stance of any developer on this project, we will not allow features that gatekeep access to the project. Not just financially, but socially as well. Lighthouse is to accommodate ANY system who finds it useful. Please avoid exclusionary language or behaviour that may make groups of people feel unwelcome. If your feature is inherently traumagenic (caters to users with trauma), we ask you to talk to us so we may make it a toggleable feature. Not everyone has memories of trauma, has the capacity to process trauma, or is traumatised. Also keep in mind that exclusionary language and behaviour can harm traumatised users who are experiencing amnesia or heavy dissociation, or users who do not fit the conventional (usually Western-centric) definition of a system. If this paragraph did not make you angry, then your feature will likely be just fine, and we look forward to seeing it!

### "Simply Plural or Octocon Replacement" Features

With the impending shutdown of Simply Plural and Octocon, we are well aware of the many apps and tools being built to fully replace these platforms. Lighthouse will not be participating in replacing any platform. We believe that the shutdown of these two incredibly influential platforms is a prime example of all-in-one platforms being a double-edged sword. Lighthouse is for journalling and for some, processing emotions in the moment. It's technically meant to be a place you visit for only about 30-60 minutes a day.

If you would like to build features that "replace" Simply Plural or Octocon, we encourage you to self-host your fork of Lighthouse. See the "Hosting Your Own Version of Lighthouse" section below for more information!

### Features That Blur The Line Between Resource and Therapy/Medical Advice

Lighthouse is not developed by medical professionals. We cannot diagnose, treat, or provide therapy to users. We cannot substitute therapy or medical advice. Tests to "definitively confirm" a mental health condition will not be accepted. Screeners like the DES-II or the GAD are fine, as these are readily available all over the internet in nearly every shape, size and flavour. Screeners also can help a user keep track of their progress. The actual diagnostic interview and test, however, would fall in this category. This is a legal thing, and an ethics thing. Even if we were medical professionals, we would have sworn to oaths that prevent us from diagnosing or treating people outside of a clinical setting. We won't be banning anyone for this one, but we will reject them and explain as gently as possible how the feature might toe the line.

### Copyrighted Material

This is mainly aimed at the artists. While Lighthouse has a skin for Gorillaz, a copyrighted band, we do not want to include any more copyrighted material in the project. If users want fandom-themed journal skins, they have the option to upload their own images to use as skins, which are not public facing (and technically not something we have access to).

This especially applies for IPs that are highly protected, such as (but not limited to) Disney or Nintendo. Anything that could even remotely be considered a trademark infringement of a highly protected IP will be requested to be changed to avoid any potential legal trouble. We understand that this can be disappointing, but this is for the safety of everyone involved with Lighthouse.

**If you are a holder of one of these IPs and would like to request the removal of your IP from the project or to request the addition of your IP to the project, please reach out to EscapeToTheCity/The Lighthouse System directly. We will be happy to accommodate your requests.**

## Code Style

The codebase is written in JavaScript, and we follow parts of the Airbnb JavaScript Style Guide. There is a config file for ESLint in the repository, and we recommend using it to ensure your code adheres to our style guidelines. You can run ESLint with the following command:

```bash
npx eslint .
```

This will check all JavaScript files in the project for style issues. Please fix any issues that are reported before submitting your pull request. We'll make sure to gently remind you if you forget. Clean code is easy to debug code!

### Little Nitpicks

We do have a couple nitpicks:

- When sectioning off routes in a file, please use the following order:
  - `POST` routes (Create)
  - `GET` routes (Read)
  - `PUT` or `PATCH` routes (Update)
  - `DELETE` routes (Delete)
  - `OPTIONS` routes (if applicable)
- We prefer double quotes for strings, but we also aren't going to get mad at you if you use single quotes. Just avoid using string concatenation with the `+` operator. Use template literals instead, since they're way easier to read and less error-prone.
- Please document your code. JSDoc is our preferred documentation style, and we would appreciate it if your code uses it. This is mainly because IDEs will show the JSDoc comments when you hover over a function or variable, which makes it easier for other developers to understand your code. Thanks for your cooperation!

## Pull Requests

When you are ready to submit your contribution, please open a pull request against the main branch. In your pull request, please include a clear description of the changes you have made. If your pull request squashes a bug, please include that bug's issue in the development section of the pull request description. If there isn't one, please create an issue for the bug. That issue should have the expected behavior, the actual behavior, and steps to reproduce the bug. If your pull request adds a feature, please include a description of the feature and how to use it.

At the end of every pull request template is a checkbox that says "I have not used an AI code generator to write this code." Please check this box to confirm that you have not used an AI code generator. If it's not checked, we will kindly ask you if you forgot to check the box. We want to assume the best first.

## Hosting Your Own Version of Lighthouse

Lighthouse is built to be self-hosted, and we encourage users to host their own versions of the project, if they would like to! If you would like to host your own version of Lighthouse, please follow the instructions in the README.md file. If you have any questions, please join our Discord [listed here](https://discord.gg/SDPDAPGYWS) and we will be happy to walk you through the process.

## Language Translations

Lighthouse is currently in the process of becoming multilingual, and we have our own l18n system set up. It will require an understanding of JSON. If you would like to contribute to a translation or even add a new language, please place your JSON file in the `lang` folder and submit a pull request. If need be, we will add a commit to put your language in the language selector on the front end. If you have any questions about how to format your JSON file, please reach out to EscapeToTheCity/The Lighthouse System directly.

You do not need to be 100% fluent in a language to contribute to a translation! If your language has formal tone (example: Japanese), we would prefer the formal tone.

## Non-Code Contributions

We also welcome non-code contributions, such as documentation, bug reports, feature requests, wiki entries and design work. If you would like to contribute in one of these ways, please open an issue or reach out to EscapeToTheCity/The Lighthouse System directly. For adding more images/artwork, you can still fork the repository and submit a pull request with your additions, since the images are stored in the repository.
