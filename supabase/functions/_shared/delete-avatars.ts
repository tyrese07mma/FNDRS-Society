type Entry = { name: string; id?: string | null };
export interface AvatarStorage {
 list(path: string, options: { limit: number; offset: number }): PromiseLike<{ data: Entry[] | null; error: unknown }>;
 remove(paths: string[]): PromiseLike<{ error: unknown }>;
}

/** Re-list offset zero after deletion so shifting pages cannot skip objects. */
export async function deleteAvatars(bucket: AvatarStorage, userId: string) {
 let operations = 0;
 async function folder(prefix: string, depth: number): Promise<void> {
  if(depth > 20) throw Error('Avatar folder nesting limit exceeded');
  while(true) {
   if(++operations > 200) throw Error('Cleanup needs another attempt');
   const {data, error} = await bucket.list(prefix, {limit:100, offset:0});
   if(error || !data) throw Error('Avatar lookup failed');
   if(!data.length) return;
   const paths:string[] = [];
   for(const entry of data) {
    if(!entry.name || entry.name.includes('/') || entry.name==='.' || entry.name==='..') throw Error('Invalid storage object');
    const path = `${prefix}/${entry.name}`;
    if(entry.id) paths.push(path);
    else await folder(path, depth+1);
   }
   if(paths.length) {
    const {error:removeError} = await bucket.remove(paths);
    if(removeError) throw Error('Avatar cleanup failed');
   }
  }
 }
 await folder(userId,0);
}
