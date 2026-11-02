export interface AdvisingClassroom {
  id: number;
  name: string;
  termId?: number;
  term?: { id: number; year: number; term: number; isActive: boolean };
}

// /users/me scopes these to the active term. Also ignore explicitly archived
// rooms if an older/cached response contains them; never pick the latest by ID.
export function currentAdvisingClasses(classes: AdvisingClassroom[] = []) {
  return classes.filter(classroom => classroom.term?.isActive !== false);
}
