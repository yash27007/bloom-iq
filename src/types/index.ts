export type Role =
  | "COURSE_COORDINATOR"
  | "MODULE_COORDINATOR"
  | "PROGRAM_COORDINATOR"
  | "CONTROLLER_OF_EXAMINATION"
  | "ADMIN";

export type Designation =
  | "ASSISTANT_PROFESSOR"
  | "ASSOCIATE_PROFESSOR"
  | "PROFESSOR";
export type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  courseCoordinator: User;
  programCoordinator: User;
  moduelCoordinator: User;
};

export type User = {
  id: string;
  facultyId: string;
  firstName: string;
  designation: Designation;
  lastName: string;
  email: string;
  course?: Course;
  role: Role;
};
