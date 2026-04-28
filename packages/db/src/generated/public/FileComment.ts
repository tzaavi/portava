import type { PortalFileId } from './PortalFile';
import type { PortalId } from './Portal';
import type { default as AuthorType } from './AuthorType';
import type { default as CommentSource } from './CommentSource';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for public.file_comment */
export type FileCommentId = string & { __brand: 'public.file_comment' };

/** Represents the table public.file_comment */
export default interface FileCommentTable {
  id: ColumnType<FileCommentId, FileCommentId | undefined, FileCommentId>;

  file_id: ColumnType<PortalFileId, PortalFileId, PortalFileId>;

  portal_id: ColumnType<PortalId, PortalId, PortalId>;

  author_type: ColumnType<AuthorType, AuthorType, AuthorType>;

  author_name: ColumnType<string, string, string>;

  content: ColumnType<string, string, string>;

  source: ColumnType<CommentSource, CommentSource, CommentSource>;

  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type FileComment = Selectable<FileCommentTable>;

export type NewFileComment = Insertable<FileCommentTable>;

export type FileCommentUpdate = Updateable<FileCommentTable>;