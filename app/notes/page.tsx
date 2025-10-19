'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Headphones, Image as ImageIcon, ArrowLeft, Plus, Calendar, Tag, Trash2, Eye, X, Edit, List, RefreshCw } from 'lucide-react';
import { getUserNotes, deleteNote, getUserChallenges, updateNote } from '@/lib/database';
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
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [viewingChallenges, setViewingChallenges] = useState<Note | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);

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

  const handlePreviewNote = async (note: Note) => {
    setPreviewNote(note);
    
    if (note.content) {
      // For markdown notes, show the content directly
      setPreviewContent(note.content);
    } else if (note.fileUrl && note.fileType === 'text') {
      // For text files, fetch the content
      try {
        const response = await fetch(note.fileUrl);
        const text = await response.text();
        setPreviewContent(text);
      } catch (error) {
        console.error('Error loading text file:', error);
        setPreviewContent('Error loading file content');
      }
    }
  };

  const closePreview = () => {
    setPreviewNote(null);
    setPreviewContent('');
  };

  const handleViewChallenges = async (note: Note) => {
    if (!currentUser?.uid) return;
    
    setViewingChallenges(note);
    setLoadingChallenges(true);
    
    try {
      const noteChallenges = await getUserChallenges(currentUser.uid);
      const filteredChallenges = noteChallenges.filter(c => c.noteId === note.id);
      setChallenges(filteredChallenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
      setChallenges([]);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const closeChallengesView = () => {
    setViewingChallenges(null);
    setChallenges([]);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditSubject(note.subject || '');
    setEditTags(note.tags.join(', '));
    setEditContent(note.content || '');
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editTitle.trim()) return;
    
    setUpdating(true);
    
    try {
      const updates: Partial<Note> = {
        title: editTitle.trim(),
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean),
        updatedAt: Timestamp.now(),
        ...(editSubject.trim() && { subject: editSubject.trim() }),
      };

      // Only include content for markdown notes (notes without files)
      if (!editingNote.fileName && editContent) {
        updates.content = editContent;
      }

      await updateNote(editingNote.id, updates);
      
      // Update local state
      setNotes(notes.map(n => 
        n.id === editingNote.id 
          ? { ...n, ...updates }
          : n
      ));
      
      setEditingNote(null);
      alert('Note updated successfully!');
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const closeEditNote = () => {
    setEditingNote(null);
    setEditTitle('');
    setEditSubject('');
    setEditTags('');
    setEditContent('');
  };

  // Add keyboard support for closing modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (previewNote) closePreview();
        if (viewingChallenges) closeChallengesView();
        if (editingNote) closeEditNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewNote, viewingChallenges, editingNote]);

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

                    {/* Preview Available Badge */}
                    {(note.content || note.fileType === 'text' || note.fileType === 'pdf' || note.fileType === 'image') && (
                      <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview Available
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
                      <div className="grid grid-cols-2 gap-2">
                        {/* Preview Button - Only for supported file types */}
                        {(note.content || note.fileType === 'text' || note.fileType === 'pdf' || note.fileType === 'image') && (
                          <Button
                            onClick={() => handlePreviewNote(note)}
                            className="!bg-green-600 !text-white hover:!bg-green-700"
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        )}
                        
                        {/* Edit Note Button */}
                        <Button
                          onClick={() => handleEditNote(note)}
                          className="!bg-gray-600 !text-white hover:!bg-gray-700"
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        {/* View Challenges Button */}
                        <Button
                          onClick={() => handleViewChallenges(note)}
                          className="!bg-purple-600 !text-white hover:!bg-purple-700"
                          variant="outline"
                          size="sm"
                        >
                          <List className="h-4 w-4 mr-1" />
                          Challenges
                        </Button>
                        
                        {/* Generate Fresh Challenges Button */}
                        <Button
                          onClick={() => handleGenerateChallenges(note)}
                          disabled={generatingChallenges === note.id}
                          className="!bg-blue-600 !text-white hover:!bg-blue-700 disabled:!bg-blue-400 disabled:!text-white"
                          variant="primary"
                          size="sm"
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${generatingChallenges === note.id ? 'animate-spin' : ''}`} />
                          {generatingChallenges === note.id 
                            ? 'Generating...' 
                            : 'Generate'
                          }
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewNote && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closePreview}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{previewNote.title}</h3>
                {previewNote.subject && (
                  <p className="text-sm text-gray-500">{previewNote.subject}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 overflow-auto max-h-[70vh]">
              {previewNote.fileType === 'image' && previewNote.fileUrl && (
                <div className="flex justify-center">
                  <img 
                    src={previewNote.fileUrl} 
                    alt={previewNote.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              
              {previewNote.fileType === 'pdf' && previewNote.fileUrl && (
                <div className="w-full h-96">
                  <iframe
                    src={previewNote.fileUrl}
                    className="w-full h-full border rounded"
                    title={previewNote.title}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    If the PDF doesn't display properly, 
                    <a 
                      href={previewNote.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      click here to open in a new tab
                    </a>
                  </p>
                </div>
              )}
              
              {(previewNote.fileType === 'text' || previewNote.content) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  {previewNote.content ? (
                    // Markdown content
                    <div 
                      className="prose prose-sm max-w-none whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: previewNote.content
                          .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                          .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
                          .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                          .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-blue-300 pl-4 italic text-gray-700 my-2">$1</blockquote>')
                          .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
                          .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto"><code>$1</code></pre>')
                          .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
                          .replace(/\n\n/g, '</p><p class="mb-2">')
                          .replace(/^/, '<p class="mb-2">')
                          .replace(/$/, '</p>')
                      }}
                    />
                  ) : (
                    // Plain text content
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {previewContent || 'Loading content...'}
                    </pre>
                  )}
                </div>
              )}
              
              {previewNote.fileType === 'audio' && (
                <div className="text-center py-8">
                  <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Audio preview not available</p>
                  {previewNote.fileUrl && (
                    <a 
                      href={previewNote.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Download audio file
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Challenges Viewing Modal */}
      {viewingChallenges && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeChallengesView}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Challenges</h3>
                <p className="text-sm text-gray-500">
                  {viewingChallenges.title}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeChallengesView}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 overflow-auto max-h-[70vh]">
              {challenges.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No challenges found for this note</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Generate challenges to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {challenges.map((challenge, index) => (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Challenge {index + 1}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {challenge.type}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{challenge.question}</p>
                      <div className="space-y-1">
                        {challenge.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="text-sm">
                            <span className="font-mono bg-gray-100 px-1 rounded mr-2">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            {option}
                          </div>
                        ))}
                      </div>
                      {challenge.correctAnswer && (
                        <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                          <span className="font-semibold text-green-800">Answer: </span>
                          <span className="text-green-700">{challenge.correctAnswer}</span>
                        </div>
                      )}
                      {challenge.explanation && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <span className="font-semibold text-blue-800">Explanation: </span>
                          <span className="text-blue-700">{challenge.explanation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeEditNote}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Edit Note</h3>
                <p className="text-sm text-gray-500">Update your note details</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeEditNote}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 overflow-auto max-h-[70vh]">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter note title"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter subject"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tags separated by commas"
                  />
                </div>

                {/* Content - Only for text/markdown notes */}
                {editingNote.fileType === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 font-mono text-sm"
                      placeholder="Enter your content in markdown format"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleUpdateNote}
                    disabled={updating || !editTitle.trim()}
                    className="!bg-blue-600 !text-white hover:!bg-blue-700 disabled:!bg-blue-400"
                  >
                    {updating ? 'Updating...' : 'Update Note'}
                  </Button>
                  <Button
                    onClick={closeEditNote}
                    variant="outline"
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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