interface SortableStudent {
  citizenId: string;
  firstName?: string;
  name?: string;
}

const getGenderRank = (student: SortableStudent) => {
  const name = (student.firstName ?? student.name ?? '').trim();

  if (/^(เด็กชาย|ด\.ช\.|นาย)/.test(name)) return 0;
  if (/^(เด็กหญิง|ด\.ญ\.|นางสาว)/.test(name)) return 1;
  return 2;
};

export const sortStudents = <T extends SortableStudent>(students: T[]): T[] =>
  [...students].sort((left, right) => {
    const genderDifference = getGenderRank(left) - getGenderRank(right);
    if (genderDifference !== 0) return genderDifference;

    const idDifference = left.citizenId.localeCompare(right.citizenId, 'th', {
      numeric: true,
      sensitivity: 'base',
    });
    if (idDifference !== 0) return idDifference;

    const leftName = left.firstName ?? left.name ?? '';
    const rightName = right.firstName ?? right.name ?? '';
    return leftName.localeCompare(rightName, 'th');
  });
