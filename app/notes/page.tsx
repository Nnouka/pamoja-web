'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Headphones, Image as ImageIcon, ArrowLeft, Plus, Calendar, Tag, Trash2 } from 'lucide-react';
import { getUserNotes, deleteNote } from '@/lib/database';
import { generateChallenges, extractContentFromFile } from '@/lib/ai-utils';
import { createChallenge } from '@/lib/database';
import { Note, Challenge } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

function NotesContent() {
  const { currentUser, userProfile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingChallenges, setGeneratingChallenges] = useState<string | null>(null);

  useEffect(() => {
    console.log('Notes page useEffect - currentUser:', currentUser?.uid);
    if (currentUser?.uid) {
      console.log('User exists, loading notes for user ID:', currentUser.uid);
      loadNotes();
    } else {
      console.log('No user available');
    }
  }, [currentUser?.uid]);

  const loadNotes = async () => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Loading notes for user:', currentUser.uid);
      const userNotes = await getUserNotes(currentUser.uid);
      console.log('Notes loaded:', userNotes.length, userNotes);
      setNotes(userNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: Note['fileType']) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-600" />;
      case 'audio':
        return <Headphones className="h-6 w-6 text-green-600" />;
      case 'image':
        return <ImageIcon className="h-6 w-6 text-blue-600" />;
      default:
        return <FileText className="h-6 w-6 text-gray-600" />;
    }
  };

  const handleGenerateChallenges = async (note: Note) => {
    if (!userProfile) return;
    
    setGeneratingChallenges(note.id);
    
    try {
      // For demo purposes, we'll use the note title and content
      const content = note.content || `Content from file: ${note.fileName}`;
      
      const response = await generateChallenges({
        content,
        fileType: note.fileType,
        subject: note.subject,
        tags: note.tags,
        difficulty: 'medium',
        count: 5
      });

      // Save challenges to database
      for (const challengeData of response.challenges) {
        await createChallenge({
          noteId: note.id,
          userId: userProfile.id,
          ...challengeData,
          createdAt: Timestamp.now()
        });
      }

      alert(`Generated ${response.challenges.length} challenges for "${note.title}"!`);
    } catch (error) {
      console.error('Error generating challenges:', error);
      alert('Failed to generate challenges. Please try again.');
    } finally {
      setGeneratingChallenges(null);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    if (!confirm(`Are you sure you want to delete "${note.title}"?`)) return;
    
    try {
      await deleteNote(note.id);
      setNotes(notes.filter(n => n.id !== note.id));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
            </div>
            <Link href="/upload">
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Upload New Notes
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-500 mb-6">
                Upload your first set of notes to start creating AI-powered challenges.
              </p>
              <Link href="/upload">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Notes
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(note.fileType)}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                        {note.subject && (
                          <CardDescription className="text-sm text-blue-600">
                            {note.subject}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(note.createdAt)}
                    </div>
                    
                    {note.fileName && (
                      <div className="text-sm text-gray-600 truncate">
                        File: {note.fileName}
                      </div>
                    )}

                    {note.content && !note.fileName && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                        <p className="font-medium text-gray-700 mb-1">Markdown Notes:</p>
                        <div className="max-h-20 overflow-hidden">
                          <pre className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed">
                            {note.content.length > 150 
                              ? note.content.substring(0, 150) + '...' 
                              : note.content
                            }
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="pt-2 border-t">
                      <Button
                        onClick={() => handleGenerateChallenges(note)}
                        disabled={generatingChallenges === note.id}
                        className="w-full"
                        variant="primary"
                        size="sm"
                      >
                        {generatingChallenges === note.id 
                          ? 'Generating...' 
                          : 'Generate Challenges'
                        }
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <NotesContent />
    </ProtectedRoute>
  );
}