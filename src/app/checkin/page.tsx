// src/app/checkin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Athlete = {
    id: string
    first_name: string
    last_name: string
    email: string
    current_week: number
    last_checkin: string | null
    assigned_date: string
    program: {
        name: string
        duration: number
    } | null
}

export default function CheckInPage() {
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
    const [confirmed, setConfirmed] = useState(false)
    const [overrideWeek, setOverrideWeek] = useState<number | null>(null)

    // Load athletes from Supabase
    useEffect(() => {
        const loadAthletes = async () => {
            const { data, error } = await supabase
                .from('athletes')
                .select(`
          id, first_name, last_name, email, current_week, last_checkin, assigned_date,
          program:program_id (name, duration)
        `)
                .order('last_name')

            if (!error && data) {
                setAthletes(data)
            }
        }

        loadAthletes()
    }, [])

    // When athlete is selected
    useEffect(() => {
        const athlete = athletes.find((a) => a.id === selectedAthleteId) || null
        setSelectedAthlete(athlete)
        setConfirmed(false)
        setOverrideWeek(null)
    }, [selectedAthleteId, athletes])

    // Calculate current week
    const calculateWeek = (assignedDate: string) => {
        const start = new Date(assignedDate)
        const now = new Date()
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
        return Math.min(diff + 1, selectedAthlete?.program?.duration || 12)
    }

    const handleConfirm = async (finalWeek: number) => {
        if (!selectedAthlete) return
        const { error } = await supabase
            .from('athletes')
            .update({
                current_week: finalWeek,
                last_checkin: new Date().toISOString().split('T')[0],
            })
            .eq('id', selectedAthlete.id)

        if (!error) setConfirmed(true)
    }

    return (
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Athlete Check-In</h1>

            <label className="block mb-2 text-sm font-medium">Select Your Name:</label>
            <select
                className="w-full p-2 border rounded mb-6"
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                value={selectedAthleteId || ''}
            >
                <option value="">-- Select --</option>
                {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                        {athlete.first_name} {athlete.last_name}
                    </option>
                ))}
            </select>

            {selectedAthlete && !confirmed && (
                <div className="space-y-4">
                    <div>
                        <p>
                            <strong>Program:</strong> {selectedAthlete.program?.name || 'N/A'} <br />
                            <strong>Duration:</strong> {selectedAthlete.program?.duration || 'N/A'} weeks <br />
                            <strong>Assigned:</strong> {selectedAthlete.assigned_date} <br />
                            <strong>You should be on:</strong> Week {calculateWeek(selectedAthlete.assigned_date)}
                        </p>
                    </div>

                    <p>Is this correct?</p>

                    <div className="flex gap-4">
                        <button
                            className="px-4 py-2 bg-green-500 text-white rounded"
                            onClick={() => handleConfirm(calculateWeek(selectedAthlete.assigned_date))}
                        >
                            Yes
                        </button>
                        <button
                            className="px-4 py-2 bg-yellow-500 text-white rounded"
                            onClick={() => setOverrideWeek(1)}
                        >
                            No, let me adjust
                        </button>
                    </div>

                    {overrideWeek !== null && (
                        <div className="mt-4">
                            <label className="block mb-2">Select Correct Week:</label>
                            <select
                                className="p-2 border rounded w-full"
                                value={overrideWeek}
                                onChange={(e) => setOverrideWeek(Number(e.target.value))}
                            >
                                {[...Array(12).keys()].map((w) => (
                                    <option key={w + 1} value={w + 1}>
                                        Week {w + 1}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                                onClick={() => handleConfirm(overrideWeek)}
                            >
                                Confirm and Check In
                            </button>
                        </div>
                    )}
                </div>
            )}

            {confirmed && (
                <div className="mt-6 p-4 bg-blue-700 border border-green-400 rounded">
                    ✅ Check-in complete! Thanks.
                </div>
            )}
        </div>
    )
}
