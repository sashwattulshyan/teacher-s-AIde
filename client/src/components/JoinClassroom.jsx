import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import './JoinClassroom.css';

const JoinClassroom = () => {
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [user] = useAuthState(auth);

  const handleJoin = async () => {
    if (!user) {
      setMessage("You must be logged in.");
      setMessageType('error');
      return;
    }

    if (!joinCode.trim()) {
      setMessage("Please enter a join code.");
      setMessageType('error');
      return;
    }

    try {
      const classroomRef = collection(db, 'classrooms');
      const q = query(classroomRef, where('joinCode', '==', joinCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage("Classroom not found. Please check the join code.");
        setMessageType('error');
        return;
      }

      const classroomDoc = querySnapshot.docs[0];
      const classroomId = classroomDoc.id;
      const classroomData = classroomDoc.data();

      if (classroomData.studentIds?.includes(user.uid)) {
        setMessage("You have already joined this classroom.");
        setMessageType('info');
        return;
      }

      await updateDoc(doc(db, 'classrooms', classroomId), {
        studentIds: [...(classroomData.studentIds || []), user.uid]
      });

      setMessage("Successfully joined classroom! Page will reload in 1.5 seconds...");
      setMessageType('success');
      setJoinCode('');
      
      // Reload the page after successfully joining
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Wait 1.5 seconds to show the success message
    } catch (error) {
      console.error("Error joining classroom:", error);
      setMessage("An error occurred. Please try again.");
      setMessageType('error');
    }
  };

  const getMessageClass = () => {
    if (!message) return '';
    return `join-message ${messageType}`;
  };

  return (
    <div className="join-classroom">
      <h3>Join a Classroom</h3>
      <div className="join-form">
        <input
          type="text"
          className="join-input"
          placeholder="Enter classroom join code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button 
          className="join-button" 
          onClick={handleJoin}
          disabled={!joinCode.trim()}
        >
          Join Classroom
        </button>
        {message && <p className={getMessageClass()}>{message}</p>}
      </div>
    </div>
  );
};

export default JoinClassroom;
