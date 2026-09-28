import 'server-only';
import { yunikoApi } from '@/src/lib/yuniko/server-api';

type PostRelationTable = 'likes' | 'reposts' | 'saves';
interface TogglePostRelationParams { table: PostRelationTable; postId: string; isActive: boolean; removeErrorMessage: string; addErrorMessage: string; }
export async function togglePostRelation({ table, postId, isActive, removeErrorMessage, addErrorMessage }: TogglePostRelationParams) {
  const route = table === 'likes' ? 'like' : table === 'saves' ? 'save' : 'repost';
  try { return await yunikoApi('/api/posts/' + encodeURIComponent(postId) + '/' + route, { method: 'POST' }); }
  catch (error) { throw new Error(isActive ? removeErrorMessage : addErrorMessage, { cause: error }); }
}
