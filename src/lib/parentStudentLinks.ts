export interface SelectedParentStudent {
    studentId: string;
    invitationCode: string;
    firstName: string;
    lastName: string;
    classroomId: number;
    classroomName: string;
}

export const studentLinks = (students: SelectedParentStudent[]) => students.map(({ studentId, invitationCode }) => ({ studentId, invitationCode }));
