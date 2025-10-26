"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createReport } from '@/lib/api/reports';
import { useRouter } from 'next/navigation';

const categories = ['POTHOLE','GARBAGE','STREETLIGHT','WATER','ROAD','OTHER'] as const;

type Category = typeof categories[number];

export function CreateIssueDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<Category>('OTHER');
  const [image, setImage] = React.useState<File | null>(null);
  const [coords, setCoords] = React.useState<{ lat?: number; lng?: number }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!open) return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({})
    );
  }, [open]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImage(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category) {
      toast.error('Please fill all fields');
      return;
    }
    if (!image) {
      toast.error('Please add a photo');
      return;
    }
    if (coords.lat == null || coords.lng == null) {
      toast.error('Location required');
      return;
    }
    setSubmitting(true);
    try {
      const { report } = await createReport({
        category,
        title,
        description,
        image,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      toast.success(`Issue created: ${report._id}`);
      setOpen(false);
      setTimeout(() => router.push('/my-reports'), 800);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Create Issue</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an issue</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="category">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="title">Title</label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="description">Description</label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="image">Photo</label>
            <Input id="image" type="file" accept="image/*" onChange={onFile} required />
          </div>
          <div className="text-xs text-muted-foreground">
            {coords.lat != null && coords.lng != null ? (
              <span>Location: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            ) : (
              <span>Waiting for location permission...</span>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
