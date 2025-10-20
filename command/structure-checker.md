Organization: Is the code placed in a sensible location within the project’s structure? New classes or modules should reside in the appropriate directory/package, and code belongs to the correct layer of the app – e.g. UI code in UI layer, logic in logic layer.

Architecture Alignment: Does the code adhere to the project’s architectural patterns and guidelines? Verify it fits with the existing architecture – for example, follows MVC or microservice boundaries – and uses consistent design patterns/naming as the rest of the system.

Low Coupling & Clear Separation: Are modules and components loosely coupled and singly focused? Each unit should have a single responsibility and minimal dependencies on others, respecting separation of concerns.

Dependencies: Did the change avoid introducing any unnecessary dependencies? No superfluous external libraries or modules are added without good reason. If a built-in or simpler solution exists, it should be used instead of bloating the project with extra dependencies.

Reusability: Has the author avoided duplicating code or functionality that already exists? Check if similar functionality is already present in the codebase and encourage reuse of existing components/utilities rather than reinventing them.
