import request from '@/config/axios'

export interface EduDeptExtVO {
  id?: number
  name: string
  parentId?: number
  sort: number
  leaderUserId?: number
  phone?: string
  email?: string
  status: number
  bizType: string
  levelNo?: number
  path?: string
  gradeCode?: string
  gradeStage?: string
  classCode?: string
  studentLimit?: number
  remark?: string
  extraJson?: string
  createTime?: string
  children?: EduDeptExtVO[]
}

export interface EduDeptExtQuery {
  name?: string
  status?: number
  bizType?: string
}

export interface EduTeacherVO {
  id?: number
  userId: number
  username?: string
  nickname?: string
  mobile?: string
  teacherNo?: string
  title?: string
  hireDate?: string
  employmentStatus: string
  deptIds: number[]
  deptNames?: string
  remark?: string
  extraJson?: string
  createTime?: string
}

export interface EduTeacherQuery extends PageParam {
  teacherNo?: string
  nickname?: string
  mobile?: string
  employmentStatus?: string
  deptId?: number
}

export interface EduStudentVO {
  id?: number
  memberUserId: number
  mobile?: string
  nickname?: string
  name?: string
  studentNo: string
  classDeptId?: number
  classDeptName?: string
  studentStatus: string
  enrollmentDate?: string
  guardianName?: string
  guardianPhone?: string
  remark?: string
  extraJson?: string
  createTime?: string
}

export interface EduStudentQuery extends PageParam {
  studentNo?: string
  nickname?: string
  mobile?: string
  classDeptId?: number
  studentStatus?: string
}

export interface EduAcademicYearVO {
  id?: number
  name: string
  code: string
  startDate: string
  endDate: string
  isCurrent: boolean
  status: number
  remark?: string
  createTime?: string
}

export interface EduAcademicYearQuery extends PageParam {
  name?: string
  code?: string
  status?: number
}

export interface EduSemesterVO {
  id?: number
  academicYearId: number
  academicYearName?: string
  name: string
  code: string
  semesterNo: number
  startDate: string
  endDate: string
  isCurrent: boolean
  status: number
  remark?: string
  createTime?: string
}

export interface EduSemesterQuery extends PageParam {
  academicYearId?: number
  name?: string
  code?: string
  semesterNo?: number
  status?: number
}

export interface EduCourseVO {
  id?: number
  name: string
  code: string
  category?: string
  stage?: string
  credit?: number
  totalHours?: number
  hoursPerWeek?: number
  status: number
  remark?: string
  createTime?: string
}

export interface EduCourseQuery extends PageParam {
  name?: string
  code?: string
  category?: string
  stage?: string
  status?: number
}

export interface EduTeacherAssignmentVO {
  id?: number
  academicYearId: number
  academicYearName?: string
  semesterId: number
  semesterName?: string
  teacherUserId: number
  teacherName?: string
  classDeptId: number
  classDeptName?: string
  courseId: number
  courseName?: string
  isMainTeacher?: boolean
  remark?: string
  createTime?: string
}

export interface EduTeacherAssignmentQuery extends PageParam {
  academicYearId?: number
  semesterId?: number
  teacherUserId?: number
  classDeptId?: number
  courseId?: number
}

export interface EduTextbookVO {
  id?: number
  courseId: number
  courseName?: string
  name: string
  code?: string
  publisher?: string
  isbn?: string
  versionName?: string
  volumeNo?: number
  publishDate?: string
  status: number
  remark?: string
  createTime?: string
}

export interface EduTextbookQuery extends PageParam {
  courseId?: number
  name?: string
  code?: string
  status?: number
}

export interface EduChapterVO {
  id?: number
  textbookId: number
  textbookName?: string
  parentId?: number
  name: string
  code?: string
  levelNo?: number
  sortOrder?: number
  pageStart?: number
  pageEnd?: number
  remark?: string
  createTime?: string
  children?: EduChapterVO[]
}

export interface EduChapterQuery {
  textbookId?: number
  parentId?: number
  name?: string
}

export interface EduKnowledgePointVO {
  id?: number
  courseId: number
  courseName?: string
  parentId?: number
  name: string
  code?: string
  stage?: string
  difficulty?: string
  keywords?: string
  sortOrder?: number
  remark?: string
  createTime?: string
  children?: EduKnowledgePointVO[]
}

export interface EduKnowledgePointQuery {
  courseId?: number
  parentId?: number
  name?: string
  stage?: string
}

export interface EduChapterKnowledgePointVO {
  id?: number
  chapterId: number
  chapterName?: string
  knowledgePointId: number
  knowledgePointName?: string
  teachingRequirement?: string
  sortOrder?: number
  remark?: string
  createTime?: string
}

export interface EduChapterKnowledgePointQuery extends PageParam {
  chapterId?: number
  knowledgePointId?: number
}

export interface EduBuildingVO {
  id?: number
  deptId: number
  deptName?: string
  name: string
  code?: string
  buildingType?: string
  floorCount?: number
  address?: string
  status: number
  remark?: string
  createTime?: string
}

export interface EduBuildingQuery extends PageParam {
  deptId?: number
  name?: string
  code?: string
  buildingType?: string
  status?: number
}

export interface EduClassroomVO {
  id?: number
  buildingId: number
  buildingName?: string
  name: string
  roomNo: string
  classroomType?: string
  capacity?: number
  floorNo?: number
  facilitiesJson?: string
  status: number
  remark?: string
  createTime?: string
}

export interface EduClassroomQuery extends PageParam {
  buildingId?: number
  name?: string
  roomNo?: string
  classroomType?: string
  status?: number
}

export const getDeptExtList = (params?: EduDeptExtQuery) => {
  return request.get<EduDeptExtVO[]>({ url: '/edu/dept-ext/list', params })
}

export const getDeptExt = (id: number) => {
  return request.get<EduDeptExtVO>({ url: '/edu/dept-ext/get', params: { id } })
}

export const createDeptExt = (data: EduDeptExtVO) => {
  return request.post<number>({ url: '/edu/dept-ext/create', data })
}

export const updateDeptExt = (data: EduDeptExtVO) => {
  return request.put<boolean>({ url: '/edu/dept-ext/update', data })
}

export const deleteDeptExt = (id: number) => {
  return request.delete<boolean>({ url: '/edu/dept-ext/delete', params: { id } })
}

export const exportDeptExt = (params?: EduDeptExtQuery) => {
  return request.download({ url: '/edu/dept-ext/export-excel', params })
}

export const getDeptExtSimpleList = (bizTypes?: string[]) => {
  const params = bizTypes?.length ? { bizTypes: bizTypes.join(',') } : undefined
  return request.get<EduDeptExtVO[]>({ url: '/edu/dept-ext/simple-list', params })
}

export const getTeacherPage = (params: EduTeacherQuery) => {
  return request.get({ url: '/edu/teacher/page', params })
}

export const getTeacher = (id: number) => {
  return request.get<EduTeacherVO>({ url: '/edu/teacher/get', params: { id } })
}

export const createTeacher = (data: EduTeacherVO) => {
  return request.post<number>({ url: '/edu/teacher/create', data })
}

export const updateTeacher = (data: EduTeacherVO) => {
  return request.put<boolean>({ url: '/edu/teacher/update', data })
}

export const deleteTeacher = (id: number) => {
  return request.delete<boolean>({ url: '/edu/teacher/delete', params: { id } })
}

export const exportTeacher = (params: EduTeacherQuery) => {
  return request.download({ url: '/edu/teacher/export-excel', params })
}

export const getTeacherSimpleList = (keyword?: string) => {
  return request.get<EduTeacherVO[]>({ url: '/edu/teacher/simple-list', params: { keyword } })
}

export const getStudentPage = (params: EduStudentQuery) => {
  return request.get({ url: '/edu/student/page', params })
}

export const getStudent = (id: number) => {
  return request.get<EduStudentVO>({ url: '/edu/student/get', params: { id } })
}

export const createStudent = (data: EduStudentVO) => {
  return request.post<number>({ url: '/edu/student/create', data })
}

export const updateStudent = (data: EduStudentVO) => {
  return request.put<boolean>({ url: '/edu/student/update', data })
}

export const deleteStudent = (id: number) => {
  return request.delete<boolean>({ url: '/edu/student/delete', params: { id } })
}

export const exportStudent = (params: EduStudentQuery) => {
  return request.download({ url: '/edu/student/export-excel', params })
}

export const getStudentSimpleList = (keyword?: string) => {
  return request.get<EduStudentVO[]>({ url: '/edu/student/simple-list', params: { keyword } })
}

export const getAcademicYearPage = (params: EduAcademicYearQuery) => {
  return request.get({ url: '/edu/academic-year/page', params })
}

export const getAcademicYear = (id: number) => {
  return request.get<EduAcademicYearVO>({ url: '/edu/academic-year/get', params: { id } })
}

export const createAcademicYear = (data: EduAcademicYearVO) => {
  return request.post<number>({ url: '/edu/academic-year/create', data })
}

export const updateAcademicYear = (data: EduAcademicYearVO) => {
  return request.put<boolean>({ url: '/edu/academic-year/update', data })
}

export const deleteAcademicYear = (id: number) => {
  return request.delete<boolean>({ url: '/edu/academic-year/delete', params: { id } })
}

export const exportAcademicYear = (params: EduAcademicYearQuery) => {
  return request.download({ url: '/edu/academic-year/export-excel', params })
}

export const getAcademicYearSimpleList = () => {
  return request.get<EduAcademicYearVO[]>({ url: '/edu/academic-year/simple-list' })
}

export const getSemesterPage = (params: EduSemesterQuery) => {
  return request.get({ url: '/edu/semester/page', params })
}

export const getSemester = (id: number) => {
  return request.get<EduSemesterVO>({ url: '/edu/semester/get', params: { id } })
}

export const createSemester = (data: EduSemesterVO) => {
  return request.post<number>({ url: '/edu/semester/create', data })
}

export const updateSemester = (data: EduSemesterVO) => {
  return request.put<boolean>({ url: '/edu/semester/update', data })
}

export const deleteSemester = (id: number) => {
  return request.delete<boolean>({ url: '/edu/semester/delete', params: { id } })
}

export const exportSemester = (params: EduSemesterQuery) => {
  return request.download({ url: '/edu/semester/export-excel', params })
}

export const getSemesterSimpleList = (academicYearId?: number) => {
  return request.get<EduSemesterVO[]>({ url: '/edu/semester/simple-list', params: { academicYearId } })
}

export const getCoursePage = (params: EduCourseQuery) => {
  return request.get({ url: '/edu/course/page', params })
}

export const getCourse = (id: number) => {
  return request.get<EduCourseVO>({ url: '/edu/course/get', params: { id } })
}

export const createCourse = (data: EduCourseVO) => {
  return request.post<number>({ url: '/edu/course/create', data })
}

export const updateCourse = (data: EduCourseVO) => {
  return request.put<boolean>({ url: '/edu/course/update', data })
}

export const deleteCourse = (id: number) => {
  return request.delete<boolean>({ url: '/edu/course/delete', params: { id } })
}

export const exportCourse = (params: EduCourseQuery) => {
  return request.download({ url: '/edu/course/export-excel', params })
}

export const getCourseSimpleList = () => {
  return request.get<EduCourseVO[]>({ url: '/edu/course/simple-list' })
}

export const getTeacherAssignmentPage = (params: EduTeacherAssignmentQuery) => {
  return request.get({ url: '/edu/teacher-assignment/page', params })
}

export const getTeacherAssignment = (id: number) => {
  return request.get<EduTeacherAssignmentVO>({
    url: '/edu/teacher-assignment/get',
    params: { id }
  })
}

export const createTeacherAssignment = (data: EduTeacherAssignmentVO) => {
  return request.post<number>({ url: '/edu/teacher-assignment/create', data })
}

export const updateTeacherAssignment = (data: EduTeacherAssignmentVO) => {
  return request.put<boolean>({ url: '/edu/teacher-assignment/update', data })
}

export const deleteTeacherAssignment = (id: number) => {
  return request.delete<boolean>({ url: '/edu/teacher-assignment/delete', params: { id } })
}

export const exportTeacherAssignment = (params: EduTeacherAssignmentQuery) => {
  return request.download({ url: '/edu/teacher-assignment/export-excel', params })
}

export const getTextbookPage = (params: EduTextbookQuery) => {
  return request.get({ url: '/edu/textbook/page', params })
}

export const getTextbook = (id: number) => {
  return request.get<EduTextbookVO>({ url: '/edu/textbook/get', params: { id } })
}

export const createTextbook = (data: EduTextbookVO) => {
  return request.post<number>({ url: '/edu/textbook/create', data })
}

export const updateTextbook = (data: EduTextbookVO) => {
  return request.put<boolean>({ url: '/edu/textbook/update', data })
}

export const deleteTextbook = (id: number) => {
  return request.delete<boolean>({ url: '/edu/textbook/delete', params: { id } })
}

export const exportTextbook = (params: EduTextbookQuery) => {
  return request.download({ url: '/edu/textbook/export-excel', params })
}

export const getTextbookSimpleList = (courseId?: number) => {
  return request.get<EduTextbookVO[]>({ url: '/edu/textbook/simple-list', params: { courseId } })
}

export const getChapterList = (params?: EduChapterQuery) => {
  return request.get<EduChapterVO[]>({ url: '/edu/chapter/list', params })
}

export const getChapter = (id: number) => {
  return request.get<EduChapterVO>({ url: '/edu/chapter/get', params: { id } })
}

export const createChapter = (data: EduChapterVO) => {
  return request.post<number>({ url: '/edu/chapter/create', data })
}

export const updateChapter = (data: EduChapterVO) => {
  return request.put<boolean>({ url: '/edu/chapter/update', data })
}

export const deleteChapter = (id: number) => {
  return request.delete<boolean>({ url: '/edu/chapter/delete', params: { id } })
}

export const exportChapter = (params?: EduChapterQuery) => {
  return request.download({ url: '/edu/chapter/export-excel', params })
}

export const getKnowledgePointList = (params?: EduKnowledgePointQuery) => {
  return request.get<EduKnowledgePointVO[]>({ url: '/edu/knowledge-point/list', params })
}

export const getKnowledgePoint = (id: number) => {
  return request.get<EduKnowledgePointVO>({ url: '/edu/knowledge-point/get', params: { id } })
}

export const createKnowledgePoint = (data: EduKnowledgePointVO) => {
  return request.post<number>({ url: '/edu/knowledge-point/create', data })
}

export const updateKnowledgePoint = (data: EduKnowledgePointVO) => {
  return request.put<boolean>({ url: '/edu/knowledge-point/update', data })
}

export const deleteKnowledgePoint = (id: number) => {
  return request.delete<boolean>({ url: '/edu/knowledge-point/delete', params: { id } })
}

export const exportKnowledgePoint = (params?: EduKnowledgePointQuery) => {
  return request.download({ url: '/edu/knowledge-point/export-excel', params })
}

export const getChapterKnowledgePointPage = (params: EduChapterKnowledgePointQuery) => {
  return request.get({ url: '/edu/chapter-knowledge-point/page', params })
}

export const getChapterKnowledgePoint = (id: number) => {
  return request.get<EduChapterKnowledgePointVO>({
    url: '/edu/chapter-knowledge-point/get',
    params: { id }
  })
}

export const createChapterKnowledgePoint = (data: EduChapterKnowledgePointVO) => {
  return request.post<number>({ url: '/edu/chapter-knowledge-point/create', data })
}

export const updateChapterKnowledgePoint = (data: EduChapterKnowledgePointVO) => {
  return request.put<boolean>({ url: '/edu/chapter-knowledge-point/update', data })
}

export const deleteChapterKnowledgePoint = (id: number) => {
  return request.delete<boolean>({ url: '/edu/chapter-knowledge-point/delete', params: { id } })
}

export const exportChapterKnowledgePoint = (params: EduChapterKnowledgePointQuery) => {
  return request.download({ url: '/edu/chapter-knowledge-point/export-excel', params })
}

export const getBuildingPage = (params: EduBuildingQuery) => {
  return request.get({ url: '/edu/building/page', params })
}

export const getBuilding = (id: number) => {
  return request.get<EduBuildingVO>({ url: '/edu/building/get', params: { id } })
}

export const createBuilding = (data: EduBuildingVO) => {
  return request.post<number>({ url: '/edu/building/create', data })
}

export const updateBuilding = (data: EduBuildingVO) => {
  return request.put<boolean>({ url: '/edu/building/update', data })
}

export const deleteBuilding = (id: number) => {
  return request.delete<boolean>({ url: '/edu/building/delete', params: { id } })
}

export const exportBuilding = (params: EduBuildingQuery) => {
  return request.download({ url: '/edu/building/export-excel', params })
}

export const getBuildingSimpleList = (deptId?: number) => {
  return request.get<EduBuildingVO[]>({ url: '/edu/building/simple-list', params: { deptId } })
}

export const getClassroomPage = (params: EduClassroomQuery) => {
  return request.get({ url: '/edu/classroom/page', params })
}

export const getClassroom = (id: number) => {
  return request.get<EduClassroomVO>({ url: '/edu/classroom/get', params: { id } })
}

export const createClassroom = (data: EduClassroomVO) => {
  return request.post<number>({ url: '/edu/classroom/create', data })
}

export const updateClassroom = (data: EduClassroomVO) => {
  return request.put<boolean>({ url: '/edu/classroom/update', data })
}

export const deleteClassroom = (id: number) => {
  return request.delete<boolean>({ url: '/edu/classroom/delete', params: { id } })
}

export const exportClassroom = (params: EduClassroomQuery) => {
  return request.download({ url: '/edu/classroom/export-excel', params })
}
