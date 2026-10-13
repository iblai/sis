/** Whether a watched group carries the app's name for this student ("Guardians of jane", "jane 的监护人"). */
export const namesStudent = (name: string, username: string) =>
  name.split(/\s+/).includes(username);
