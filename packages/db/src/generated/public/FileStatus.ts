/** Represents the enum public.file_status */
type FileStatus = 
  | 'awaiting_review'
  | 'approved'
  | 'revision_requested'
  | 'archived';

export default FileStatus;