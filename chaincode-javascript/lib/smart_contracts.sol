// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract ElectionContract {
    enum ElectionState {
        None,
        Draft,
        VotingOpen,
        VotingClosed,
        ResultFinalized
    }

    struct Election {
        bool exists;
        string electionId;
        string title;
        string adminId;              // metadata/admin label from original code
        address admin;               // actual on-chain admin
        ElectionState state;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVotes;
        uint256 createdAt;
        uint256 votingOpenedAt;
        uint256 votingClosedAt;
        uint256 finalizedAt;
        string winnerCandidateId;
        string[] candidateIds;
        string[] voterIds;
        string[] ballotVoterIds;
    }

    struct Voter {
        bool exists;
        string electionId;
        string voterId;
        string voterNameHash;
        string department;
        string eligibilityHash;
        bool isEligible;
        bool hasVoted;
        uint256 registeredAt;
        uint256 votedAt;
    }

    struct Candidate {
        bool exists;
        string electionId;
        string candidateId;
        string name;
        string party;
        uint256 voteCount;
        uint256 registeredAt;
    }

    struct Ballot {
        bool exists;
        string electionId;
        string voterId;
        string candidateId;
        string ballotCommitment;
        uint256 castAt;
    }

    struct AuditEntry {
        string action;
        address actor;
        string details;
        uint256 timestamp;
    }

    struct ElectionView {
        string electionId;
        string title;
        string adminId;
        address admin;
        string state;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVotes;
        uint256 createdAt;
        uint256 votingOpenedAt;
        uint256 votingClosedAt;
        uint256 finalizedAt;
        string winnerCandidateId;
        uint256 candidateCount;
        uint256 voterCount;
        string[] candidateIds;
    }

    struct CandidateView {
        string electionId;
        string candidateId;
        string name;
        string party;
        uint256 voteCount;
        uint256 registeredAt;
    }

    struct VoterPublicView {
        string voterId;
        string electionId;
        string department;
        bool hasVoted;
        uint256 registeredAt;
    }

    struct CandidateResult {
        string candidateId;
        string name;
        string party;
        uint256 voteCount;
    }

    struct ResultsView {
        string electionId;
        string state;
        uint256 totalVotes;
        string winnerCandidateId;
        uint256 finalizedAt;
        CandidateResult[] results;
    }

    mapping(string => Election) private elections;
    mapping(string => mapping(string => Voter)) private votersByElection;
    mapping(string => mapping(string => Candidate)) private candidatesByElection;
    mapping(string => mapping(string => Ballot)) private ballotsByElectionAndVoter;
    mapping(string => AuditEntry[]) private auditTrailByElection;

    event ElectionCreated(
        string indexed electionId,
        string title,
        string adminId,
        address indexed admin,
        uint256 timestamp
    );

    event VoterRegistered(
        string indexed electionId,
        string indexed voterId,
        string department,
        uint256 timestamp
    );

    event CandidateRegistered(
        string indexed electionId,
        string indexed candidateId,
        string name,
        string party,
        uint256 timestamp
    );

    event ElectionStateChanged(
        string indexed electionId,
        string oldState,
        string newState,
        uint256 totalVotes,
        uint256 timestamp
    );

    event VoteCast(
        string indexed electionId,
        string indexed voterId,
        string indexed candidateId,
        string ballotCommitment,
        uint256 timestamp
    );

    event ResultsFinalized(
        string indexed electionId,
        uint256 totalVotes,
        uint256 candidatesCount,
        string winnerCandidateId,
        uint256 timestamp
    );

    modifier electionExists(string memory electionId) {
        require(elections[electionId].exists, "Election does not exist");
        _;
    }

    modifier onlyAdmin(string memory electionId) {
        require(elections[electionId].exists, "Election does not exist");
        require(elections[electionId].admin == msg.sender, "Only election admin can call this");
        _;
    }

    function initLedger() external pure returns (bool) {
        // Fabric has InitLedger patterns; in Solidity this is usually not needed.
        return true;
    }

    function createElection(
        string calldata electionId,
        string calldata title,
        uint256 startTime,
        uint256 endTime,
        string calldata adminId
    ) external {
        require(bytes(electionId).length > 0, "Election ID is required");
        require(bytes(title).length > 0, "Title is required");
        require(bytes(adminId).length > 0, "Admin ID is required");
        require(startTime < endTime, "Start time must be before end time");
        require(!elections[electionId].exists, "Election already exists");

        Election storage election = elections[electionId];
        election.exists = true;
        election.electionId = electionId;
        election.title = title;
        election.adminId = adminId;
        election.admin = msg.sender;
        election.state = ElectionState.Draft;
        election.startTime = startTime;
        election.endTime = endTime;
        election.totalVotes = 0;
        election.createdAt = block.timestamp;

        emit ElectionCreated(electionId, title, adminId, msg.sender, block.timestamp);

        _addAudit(
            electionId,
            "ElectionCreated",
            string(
                abi.encodePacked(
                    "title=",
                    title,
                    ", adminId=",
                    adminId
                )
            )
        );
    }

    function registerVoter(
        string calldata electionId,
        string calldata voterId,
        string calldata voterNameHash,
        string calldata department,
        string calldata eligibilityHash
    ) external onlyAdmin(electionId) {
        require(bytes(voterId).length > 0, "Voter ID is required");
        require(bytes(voterNameHash).length > 0, "Voter name hash is required");
        require(bytes(department).length > 0, "Department is required");
        require(bytes(eligibilityHash).length > 0, "Eligibility hash is required");

        Election storage election = elections[electionId];
        require(election.state == ElectionState.Draft, "Voters can only be registered in Draft state");
        require(!votersByElection[electionId][voterId].exists, "Voter already registered");

        Voter storage voter = votersByElection[electionId][voterId];
        voter.exists = true;
        voter.electionId = electionId;
        voter.voterId = voterId;
        voter.voterNameHash = voterNameHash;
        voter.department = department;
        voter.eligibilityHash = eligibilityHash;
        voter.isEligible = true; // assumed verified off-chain before registration
        voter.hasVoted = false;
        voter.registeredAt = block.timestamp;

        election.voterIds.push(voterId);

        emit VoterRegistered(electionId, voterId, department, block.timestamp);

        _addAudit(
            electionId,
            "VoterRegistered",
            string(
                abi.encodePacked(
                    "voterId=",
                    voterId,
                    ", department=",
                    department
                )
            )
        );
    }

    function registerCandidate(
        string calldata electionId,
        string calldata candidateId,
        string calldata candidateName,
        string calldata partyName
    ) external onlyAdmin(electionId) {
        require(bytes(candidateId).length > 0, "Candidate ID is required");
        require(bytes(candidateName).length > 0, "Candidate name is required");
        require(bytes(partyName).length > 0, "Party name is required");

        Election storage election = elections[electionId];
        require(election.state == ElectionState.Draft, "Candidates can only be registered in Draft state");
        require(!candidatesByElection[electionId][candidateId].exists, "Candidate already registered");

        Candidate storage candidate = candidatesByElection[electionId][candidateId];
        candidate.exists = true;
        candidate.electionId = electionId;
        candidate.candidateId = candidateId;
        candidate.name = candidateName;
        candidate.party = partyName;
        candidate.voteCount = 0;
        candidate.registeredAt = block.timestamp;

        election.candidateIds.push(candidateId);

        emit CandidateRegistered(
            electionId,
            candidateId,
            candidateName,
            partyName,
            block.timestamp
        );

        _addAudit(
            electionId,
            "CandidateRegistered",
            string(
                abi.encodePacked(
                    "candidateId=",
                    candidateId,
                    ", name=",
                    candidateName,
                    ", party=",
                    partyName
                )
            )
        );
    }

    function openVoting(string calldata electionId)
        external
        onlyAdmin(electionId)
    {
        Election storage election = elections[electionId];

        require(election.state == ElectionState.Draft, "Voting can only be opened from Draft state");
        require(election.candidateIds.length > 0, "At least one candidate is required");
        require(block.timestamp >= election.startTime, "Cannot open voting before start time");
        require(block.timestamp < election.endTime, "Election has already passed end time");

        string memory oldState = _stateToString(election.state);

        election.state = ElectionState.VotingOpen;
        election.votingOpenedAt = block.timestamp;

        emit ElectionStateChanged(
            electionId,
            oldState,
            _stateToString(election.state),
            election.totalVotes,
            block.timestamp
        );

        _addAudit(
            electionId,
            "VotingOpened",
            "Election moved to VotingOpen state"
        );
    }

    function castVote(
        string calldata electionId,
        string calldata voterId,
        string calldata candidateId,
        string calldata ballotCommitment
    ) external electionExists(electionId) {
        require(bytes(voterId).length > 0, "Voter ID is required");
        require(bytes(candidateId).length > 0, "Candidate ID is required");
        require(bytes(ballotCommitment).length > 0, "Ballot commitment is required");

        Election storage election = elections[electionId];
        require(election.state == ElectionState.VotingOpen, "Election is not open for voting");
        require(block.timestamp >= election.startTime, "Voting has not started yet");
        require(block.timestamp <= election.endTime, "Voting period has ended");

        Voter storage voter = votersByElection[electionId][voterId];
        require(voter.exists, "Voter not registered");
        require(voter.isEligible, "Voter is not eligible");
        require(!voter.hasVoted, "Voter has already cast a vote");

        Candidate storage candidate = candidatesByElection[electionId][candidateId];
        require(candidate.exists, "Candidate does not exist");

        Ballot storage ballot = ballotsByElectionAndVoter[electionId][voterId];
        require(!ballot.exists, "Ballot already exists for this voter");

        ballot.exists = true;
        ballot.electionId = electionId;
        ballot.voterId = voterId;
        ballot.candidateId = candidateId;
        ballot.ballotCommitment = ballotCommitment;
        ballot.castAt = block.timestamp;

        voter.hasVoted = true;
        voter.votedAt = block.timestamp;

        candidate.voteCount += 1;
        election.totalVotes += 1;
        election.ballotVoterIds.push(voterId);

        emit VoteCast(
            electionId,
            voterId,
            candidateId,
            ballotCommitment,
            block.timestamp
        );

        _addAudit(
            electionId,
            "VoteCast",
            string(
                abi.encodePacked(
                    "voterId=",
                    voterId,
                    ", candidateId=",
                    candidateId
                )
            )
        );
    }

    function closeVoting(string calldata electionId)
        external
        onlyAdmin(electionId)
    {
        Election storage election = elections[electionId];
        require(election.state == ElectionState.VotingOpen, "Cannot close voting from current state");

        string memory oldState = _stateToString(election.state);

        election.state = ElectionState.VotingClosed;
        election.votingClosedAt = block.timestamp;

        emit ElectionStateChanged(
            electionId,
            oldState,
            _stateToString(election.state),
            election.totalVotes,
            block.timestamp
        );

        _addAudit(
            electionId,
            "VotingClosed",
            "Election moved to VotingClosed state"
        );
    }

    function finalizeTally(string calldata electionId)
        external
        onlyAdmin(electionId)
    {
        Election storage election = elections[electionId];
        require(election.state == ElectionState.VotingClosed, "Cannot finalize tally from current state");

        string memory winningCandidateId = "";
        uint256 highestVotes = 0;
        bool initialized = false;

        for (uint256 i = 0; i < election.candidateIds.length; i++) {
            string memory candidateId = election.candidateIds[i];
            Candidate storage candidate = candidatesByElection[electionId][candidateId];

            if (!initialized || candidate.voteCount > highestVotes) {
                highestVotes = candidate.voteCount;
                winningCandidateId = candidate.candidateId;
                initialized = true;
            }
        }

        election.state = ElectionState.ResultFinalized;
        election.finalizedAt = block.timestamp;
        election.winnerCandidateId = winningCandidateId;

        emit ResultsFinalized(
            electionId,
            election.totalVotes,
            election.candidateIds.length,
            winningCandidateId,
            block.timestamp
        );

        _addAudit(
            electionId,
            "ResultsFinalized",
            string(
                abi.encodePacked(
                    "winnerCandidateId=",
                    winningCandidateId
                )
            )
        );
    }

    function getElection(string calldata electionId)
        external
        view
        electionExists(electionId)
        returns (ElectionView memory)
    {
        Election storage election = elections[electionId];
        string[] memory candidateIds = new string[](election.candidateIds.length);

        for (uint256 i = 0; i < election.candidateIds.length; i++) {
            candidateIds[i] = election.candidateIds[i];
        }

        return ElectionView({
            electionId: election.electionId,
            title: election.title,
            adminId: election.adminId,
            admin: election.admin,
            state: _stateToString(election.state),
            startTime: election.startTime,
            endTime: election.endTime,
            totalVotes: election.totalVotes,
            createdAt: election.createdAt,
            votingOpenedAt: election.votingOpenedAt,
            votingClosedAt: election.votingClosedAt,
            finalizedAt: election.finalizedAt,
            winnerCandidateId: election.winnerCandidateId,
            candidateCount: election.candidateIds.length,
            voterCount: election.voterIds.length,
            candidateIds: candidateIds
        });
    }

    function getCandidate(
        string calldata electionId,
        string calldata candidateId
    ) external view electionExists(electionId) returns (CandidateView memory) {
        require(bytes(candidateId).length > 0, "Candidate ID is required");

        Candidate storage candidate = candidatesByElection[electionId][candidateId];
        require(candidate.exists, "Candidate not found");

        return CandidateView({
            electionId: candidate.electionId,
            candidateId: candidate.candidateId,
            name: candidate.name,
            party: candidate.party,
            voteCount: candidate.voteCount,
            registeredAt: candidate.registeredAt
        });
    }

    function getVoter(
        string calldata electionId,
        string calldata voterId
    ) external view electionExists(electionId) returns (VoterPublicView memory) {
        require(bytes(voterId).length > 0, "Voter ID is required");

        Voter storage voter = votersByElection[electionId][voterId];
        require(voter.exists, "Voter not found");

        return VoterPublicView({
            voterId: voter.voterId,
            electionId: voter.electionId,
            department: voter.department,
            hasVoted: voter.hasVoted,
            registeredAt: voter.registeredAt
        });
    }

    function getResults(string calldata electionId)
        external
        view
        electionExists(electionId)
        returns (ResultsView memory)
    {
        Election storage election = elections[electionId];
        require(
            election.state == ElectionState.ResultFinalized,
            "Results available only in ResultFinalized state"
        );

        CandidateResult[] memory results = new CandidateResult[](election.candidateIds.length);

        for (uint256 i = 0; i < election.candidateIds.length; i++) {
            Candidate storage candidate = candidatesByElection[electionId][election.candidateIds[i]];
            results[i] = CandidateResult({
                candidateId: candidate.candidateId,
                name: candidate.name,
                party: candidate.party,
                voteCount: candidate.voteCount
            });
        }

        return ResultsView({
            electionId: election.electionId,
            state: _stateToString(election.state),
            totalVotes: election.totalVotes,
            winnerCandidateId: election.winnerCandidateId,
            finalizedAt: election.finalizedAt,
            results: results
        });
    }

    function getElectionAuditTrail(string calldata electionId)
        external
        view
        electionExists(electionId)
        returns (AuditEntry[] memory)
    {
        AuditEntry[] storage logs = auditTrailByElection[electionId];
        AuditEntry[] memory copied = new AuditEntry[](logs.length);

        for (uint256 i = 0; i < logs.length; i++) {
            copied[i] = AuditEntry({
                action: logs[i].action,
                actor: logs[i].actor,
                details: logs[i].details,
                timestamp: logs[i].timestamp
            });
        }

        return copied;
    }

    function _addAudit(
        string memory electionId,
        string memory action,
        string memory details
    ) internal {
        auditTrailByElection[electionId].push(
            AuditEntry({
                action: action,
                actor: msg.sender,
                details: details,
                timestamp: block.timestamp
            })
        );
    }

    function _stateToString(ElectionState state)
        internal
        pure
        returns (string memory)
    {
        if (state == ElectionState.Draft) return "Draft";
        if (state == ElectionState.VotingOpen) return "VotingOpen";
        if (state == ElectionState.VotingClosed) return "VotingClosed";
        if (state == ElectionState.ResultFinalized) return "ResultFinalized";
        return "None";
    }
}
