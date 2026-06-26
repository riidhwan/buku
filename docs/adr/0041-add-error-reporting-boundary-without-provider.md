# Add error reporting boundary without provider

The initial scaffold includes an internal error reporting boundary and global unexpected-error handling, but no external crash reporting provider. A provider such as Sentry or Firebase can be added later behind the existing reporter interface when distribution and privacy requirements are known.
