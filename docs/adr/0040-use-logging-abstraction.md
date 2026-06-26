# Use a logging abstraction

The app uses a core logging abstraction instead of direct `console` calls. Direct console usage is allowed only inside the logger implementation, which keeps logging mockable in tests and replaceable for production reporting later.
