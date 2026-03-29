/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');


class ElectionContract extends Contract {

    /**
     * InitLedger - Initialize ledger with sample data (optional)
     * @param {Context} ctx - Transaction context
     */
    async initLedger(ctx) {
        console.info('-- START : Initialize Ledger --');
        const elections = [];
        console.info('-- END : Initialize Ledger --');
    }

   
    async createElection(ctx, electionId, title, startTime, endTime, adminId) {
        console.info('-- START : Create Election --');

        // Validate inputs
        if (!electionId || !title || !adminId) {
            throw new Error('Election ID, title, and admin ID are required');
        }

        const startNum = parseInt(startTime);
        const endNum = parseInt(endTime);

        if (isNaN(startNum) || isNaN(endNum)) {
            throw new Error('Start and end time must be valid numbers');
        }

        if (startNum >= endNum) {
            throw new Error('Start time must be before end time');
        }

        // Check if election already exists
        const electionKey = ctx.stub.createCompositeKey('Election', [electionId]);
        const existingElection = await ctx.stub.getState(electionKey);
        if (existingElection && existingElection.length > 0) {
            throw new Error(`Election with ID ${electionId} already exists`);
        }

        // Create election object
        const election = {
            electionId: electionId,
            title: title,
            adminId: adminId,
            state: 'Draft',
            startTime: startNum,
            endTime: endNum,
            candidates: [],
            voters: [],
            ballots: [],
            totalVotes: 0,
            createdAt: ctx.stub.getTxTimestamp()
        };

        // Store in ledger
        await ctx.stub.putState(electionKey, Buffer.from(JSON.stringify(election)));

        // Emit event
        ctx.stub.setEvent('ElectionCreated', Buffer.from(JSON.stringify({
            electionId: electionId,
            title: title,
            adminId: adminId,
            timestamp: ctx.stub.getTxTimestamp()
        })));

        console.info('-- END : Create Election --');
        return JSON.stringify(election);
    }


    async registerVoter(ctx, electionId, voterId, voterNameHash, department, eligibilityHash) {
        console.info('-- START : Register Voter --');

        //TODO: register voters with hashed identity and eligibility verification
    }


    async registerCandidate(ctx, electionId, candidateId, candidateName, partyName) {
        console.info('-- START : Register Candidate --');

        // Validate inputs
  
    }

  
    async openVoting(ctx, electionId) {
        console.info('-- START : Open Voting --');

        // Validate input
        if (!electionId) {
            throw new Error('Election ID is required');
        }

        // Get election
        const electionKey = ctx.stub.createCompositeKey('Election', [electionId]);
        const electionBytes = await ctx.stub.getState(electionKey);

        
    }

   
    async castVote(ctx, electionId, voterId, candidateId, ballotCommitment) {
        console.info('-- START : Cast Vote --');

        // Validate inputs
        if (!electionId || !voterId || !candidateId || !ballotCommitment) {
            throw new Error('Election ID, voter ID, candidate ID, and ballot commitment are required');
        }

       
    }

 
    async closeVoting(ctx, electionId) {
        console.info('-- START : Close Voting --');

        // Validate input
        if (!electionId) {
            throw new Error('Election ID is required');
        }


        const electionKey = ctx.stub.createCompositeKey('Election', [electionId]);
        const electionBytes = await ctx.stub.getState(electionKey);

        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election with ID ${electionId} does not exist`);
        }

        const election = JSON.parse(electionBytes);


        if (election.state !== 'VotingOpen') {
            throw new Error(`Cannot close voting from ${election.state} state`);
        }


        election.state = 'VotingClosed';
        election.votingClosedAt = ctx.stub.getTxTimestamp();


        await ctx.stub.putState(electionKey, Buffer.from(JSON.stringify(election)));


        ctx.stub.setEvent('ElectionStateChanged', Buffer.from(JSON.stringify({
            electionId: electionId,
            oldState: 'VotingOpen',
            newState: 'VotingClosed',
            totalVotes: election.totalVotes,
            timestamp: ctx.stub.getTxTimestamp()
        })));

        console.info('-- END : Close Voting --');
        return JSON.stringify({ status: 'success', message: 'Voting closed', totalVotes: election.totalVotes });
    }

  
    async finalizeTally(ctx, electionId) {
        console.info('-- START : Finalize Tally --');

        // Validate input
        if (!electionId) {
            throw new Error('Election ID is required');
        }


        const electionKey = ctx.stub.createCompositeKey('Election', [electionId]);
        const electionBytes = await ctx.stub.getState(electionKey);

        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election with ID ${electionId} does not exist`);
        }

        const election = JSON.parse(electionBytes);


        if (election.state !== 'VotingClosed') {
            throw new Error(`Cannot finalize tally from ${election.state} state`);
        }


        let results = [];
        if (election.candidates && election.candidates.length > 0) {
            for (let candidateId of election.candidates) {
                const candidateKey = ctx.stub.createCompositeKey('Candidate', [electionId, candidateId]);
                const candidateBytes = await ctx.stub.getState(candidateKey);

                if (candidateBytes && candidateBytes.length > 0) {
                    const candidate = JSON.parse(candidateBytes);
                    results.push({
                        candidateId: candidate.candidateId,
                        name: candidate.name,
                        party: candidate.party,
                        voteCount: candidate.voteCount
                    });
                }
            }
        }

        // Determine winner
        let winner = null;
        if (results.length > 0) {
            winner = results.reduce((max, curr) => curr.voteCount > max.voteCount ? curr : max);
        }

        // Update election state
        election.state = 'ResultFinalized';
        election.finalizedAt = ctx.stub.getTxTimestamp();
        election.results = results;
        election.winner = winner;

        // Store updated election
        await ctx.stub.putState(electionKey, Buffer.from(JSON.stringify(election)));

        // Emit event
        ctx.stub.setEvent('ResultsFinalized', Buffer.from(JSON.stringify({
            electionId: electionId,
            totalVotes: election.totalVotes,
            candidatesCount: results.length,
            winner: winner ? winner.candidateId : null,
            timestamp: ctx.stub.getTxTimestamp()
        })));

        console.info('-- END : Finalize Tally --');
        return JSON.stringify({
            status: 'success',
            message: 'Tally finalized',
            totalVotes: election.totalVotes,
            winner: winner,
            results: results
        });
    }


    async getElection(ctx, electionId) {
        
    }

   
    async getCandidate(ctx, electionId, candidateId) {
        console.info('-- START : Get Candidate --');

        // Validate inputs
        if (!electionId || !candidateId) {
            throw new Error('Election ID and candidate ID are required');
        }

        // Get candidate
        const candidateKey = ctx.stub.createCompositeKey('Candidate', [electionId, candidateId]);
        const candidateBytes = await ctx.stub.getState(candidateKey);

        if (!candidateBytes || candidateBytes.length === 0) {
            throw new Error(`Candidate ${candidateId} not found for election ${electionId}`);
        }

        const candidate = JSON.parse(candidateBytes);
        console.info('-- END : Get Candidate --');
        return JSON.stringify(candidate);
    }

 
    async getVoter(ctx, electionId, voterId) {
        console.info('-- START : Get Voter --');

        // Validate inputs
        if (!electionId || !voterId) {
            throw new Error('Election ID and voter ID are required');
        }


        const voterKey = ctx.stub.createCompositeKey('Voter', [electionId, voterId]);
        const voterBytes = await ctx.stub.getState(voterKey);

        if (!voterBytes || voterBytes.length === 0) {
            throw new Error(`Voter ${voterId} not found for election ${electionId}`);
        }

        const voter = JSON.parse(voterBytes);

  
        const voterPublic = {
            voterId: voter.voterId,
            electionId: voter.electionId,
            department: voter.department,
            hasVoted: voter.hasVoted,
            registeredAt: voter.registeredAt
        };

        console.info('-- END : Get Voter --');
        return JSON.stringify(voterPublic);
    }

   
    async getResults(ctx, electionId) {
        console.info('-- START : Get Results --');

        // Validate input
        if (!electionId) {
            throw new Error('Election ID is required');
        }


        const electionKey = ctx.stub.createCompositeKey('Election', [electionId]);
        const electionBytes = await ctx.stub.getState(electionKey);

        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election with ID ${electionId} does not exist`);
        }

        const election = JSON.parse(electionBytes);

   
        if (election.state !== 'ResultFinalized') {
            throw new Error(`Results not available. Election state is ${election.state}. Results available only in ResultFinalized state.`);
        }

        // Return results
        const resultsData = {
            electionId: electionId,
            state: election.state,
            totalVotes: election.totalVotes,
            winner: election.winner || null,
            results: election.results || [],
            finalizedAt: election.finalizedAt
        };

        console.info('-- END : Get Results --');
        return JSON.stringify(resultsData);
    }

  
    async getElectionAuditTrail(ctx, electionId) {
        
    }
}

module.exports = ElectionContract;
