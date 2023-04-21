# Veles ID White Paper

## Identity 

Your identity is inherent and nobody can take it away from you. The value of your identity refers to your intangible value as a human being—your potential. Identity is the “I” in “**I** think, therefore **I am**”.

Identity means a sense of self, defined by unique characteristics, and refers to being a distinct entity. Non-human entities, like organizations, can have their unique identities as well.

Identity is an integral part of a healthy functioning society and economy. Having a proper way to identify ourselves and our possessions enables us to create thriving societies and global markets. Using online services, opening a bank account, voting in elections, buying property, and securing employment—all of these activities require proving identity.

Unfortunately, many identifiers which lead to different data points of personal identity are outside our control.

## Identifiers

Identifiers are pointers to the “**I**” in Identity. Identifiers lead to data points characterizing your unique identity. A name, email, website address, and social security number—are all identifiers.

Those identifiers are by large controlled by third parties. This means organizations issuing your identifiers have control over how you manifest your identity, both in the digital and in the physical world.


## Digital Identity

Our lives are increasingly connected to the apps and services we use. A digital identity arises organically from the use of personal information on the Web and from the digital footprints created by our actions online. Among various approaches to digital identity, a decentralized identity represents the most value due to the level of control it offers over personal identifiers.

The silo-based approach to data, which requires maintaining separate identifiers for each site you use, means that your ID and personal data are available only within the context of this particular website or application. Not only is this a big trade-off in usability, but it also creates plenty of data honeypots for hackers. 

To solve this problem in Web2, providers have tried to connect different identity silos together in various federated models. However, these have produced side effects such as:
- concentrating more control around a smaller number of providers, 
- increasing data leakage through sharing, 
- rising privacy concerns.

## The problem

`Platforms own your data`

In an increasingly digital society, personal data have become a new form of currency. Big revenues of corporations behind the most popular online platforms show how valuable aggregated user data is. When platforms own user IDs, it gives them the power to control, censor, and even revoke access. 

Many organizations require new users to submit identity information, and companies have proven to be sloppy at safeguarding user data. Modern data centers are honeypots for hackers, which leads to numerous [data breaches](https://www.csoonline.com/article/2130877/the-biggest-data-breaches-of-the-21st-century.html).

Password-based authentication is an insecure approach to online interactions and multi-factor schemes add friction that reduces user adoption and productivity. That's how most online services have worked in Web2.

## The solution

`Self-sovereign identity wallet on Bitcoin`

We are at the dawn of Web3—designed to bring identity and private data ownership back to users.

Web3 standards provide a common identity layer that allows people and organizations to have their own self-sovereign identity—a digital identity they own and control, which cannot be taken away from them. Veles ID is an open-source movement, building in public to unleash a new wave of innovation in digital identity. Powered by Bitcoin.

Veles ID wallet helps you take back ownership of your data with user-friendly tools for aggregating and tokenizing data on the Bitcoin blockchain. With Veles ID wallet you will be able to manage your online ID and data in one place.

Instead of putting trust in Big Tech companies to safeguard your sensitive information, you can regain control over your data with decentralized identifiers you control.

With a decentralized identity, you can use the same identity across different platforms without the need to create many logins and passwords. Decentralized authentication provides a convenient and secure way for passwordless login.

## Interoperability

Identity wallets in Web3 are like Internet browsers in Web2, which is a point of entry. Twenty-five years ago, early-stage web browsers were incompatible and non-standardized. That resulted in a set of standards that ensured interoperability and helped the web to evolve.

Up until last year, the decentralized identity solutions were incompatible and non-standardized. The World Wide Web Consortium (W3C) standardization of Decentralized Identifiers ([DIDs](https://www.w3.org/TR/did-core/)) on July 19, 2022, in pair with W3C interoperable Verifiable Credentials ([VCs](https://www.w3.org/TR/vc-data-model/)), and with Public Key Infrastructure ([PKI](https://en.wikipedia.org/wiki/Public_key_infrastructure)) provided by Bitcoin, paves a way for innovation in the space of self-sovereign identity.

## Decentralized Identity

Decentralized Identity refers to a system of identity management. It's an emerging field within Identity and Access Management, which is often abbreviated as **IAM**. Decentralized identity improves existing identity management standards and gives you greater control over personal data. A decentralized identity uses cybersecurity technologies, such as public-key cryptography, which enable the creation and control over decentralized identifiers.

With decentralized identity systems users regain control over their identifiers, while greatly reducing the opportunity for surveillance.

## Portability

With decentralized identity systems, your data becomes portable, without compromising privacy and security. Through your smartphone connected to the Internet, your ID and data can be always with you, available whenever you need it. You gain the possibility to safely share data and configurations between various services and platforms, with the highest levels of privacy and security.

## Decentralized Identifiers

Decentralized identity introduces the concept of user-owned IDs, which may be a hard pill to swallow for many governments and corporations. DIDs are cryptographically-secured Identifiers that you create, own, and control.

> “Decentralized identifiers are a new type of identifier that enables verifiable, decentralized digital identity. In contrast to typical, federated identifiers, DIDs have been designed so that they may be decoupled from centralized registries, identity providers, and certificate authorities. Specifically, while other parties might be used to help enable the discovery of information related to a DID, the design enables the controller of a DID to prove control over it without requiring permission from any other party. **DIDs are URIs** that associate a DID subject with a DID document allowing trustable interactions associated with that subject.” – W3C [Decentralized Identifiers v1.0](https://www.w3.org/TR/did-core/)

Decentralized identifiers are stored on distributed ledgers and blockchains, they are tamper-proof, secure, and instantly verifiable by anyone. This reduces the need to store identity information on centralized servers and makes it easier for users to access services seamlessly. Essentially, the blockchain acts like a global directory that enables the verification of DIDs associated with certain entities.

A Decentralized Identifier, is a new type of Uniform Resource Identifier ([URI](https://www.rfc-editor.org/rfc/rfc3986)) composed of three parts: 
- Scheme, 
- Method, 
- Identifier.

DIDs incorporate other standard URI components such as path, query, and fragment in order to locate particular data, like a cryptographic public key inside a DID document or an external web resource. All DIDs are public, analogously to the way the world wide web’s Domain Name System (DNS) is public. Yet, DIDs hold no personal data.

DIDs simple syntax describes a method and identifier:

![image](https://user-images.githubusercontent.com/69667092/233659775-e34db2bf-7f3a-43ae-955e-50477ae8f388.png)

This example DID above points to a _DID document_ (which is a [JSON-LD object](https://json-ld.org/spec/latest/json-ld/)). The _DID document_ describes _DID Subject_. Any resource might serve as a _DID subject_. This could be a person, group, organization, as well as thing, or concept. This means that the _subject_ can relate to all types of data, including texts, images, audio, and video.

## Warm data

Because decentralized identifiers are URI, they are pointing to where the data is located instead of representing the actual data storage. The International Bateson Institute describes interrelationships between information as Warm Data:

> “Warm Data is the information about interrelationships that integrate elements of a complex system. It has found the qualitative dynamics and offers another dimension of understanding to what is learned through quantitative data (cold data). Warm Data will provide leverage in our analysis of other streams of information. The implications for the uses of Warm Data are staggering, and may offer a whole new dimension to the tools of information science we have to work with at present.” – [Warm Data](https://batesoninstitute.org/warm-data/), The International Bateson Institute

## Verifiable Credentials

Verifiable Credentials (VCs) complement DIDs and empower decentralized identity management. VCs (also known as attestations) are tamper-proof, cryptographically verifiable claims made by the issuer. Every attestation or Verifiable Credential is associated with a DID. Verifiable Credentials represent statements made by an issuer in a tamper-evident and privacy-respecting manner since they use public-key encryption to verify claims.

Anyone can use the embedded issuer DID in the Verifiable Credential to find a public cryptographic key in the associated DID document and do the math to confirm. Because DIDs are stored on the blockchain, anyone can verify attestations by cross-checking the issuer's DID.

## Public Key Infrastructure

Decentralization reengineers how data is stored and secured. Bitcoin brings a new paradigm in reducing cyber risks with its public-key cryptography infrastructure.

With a decentralized identity, you can safely use one ID for different services. Thanks to Public Key Infrastructure provided by Bitcoin, you gain the ability to log in with a single click to a growing number of online services.

Decentralized Public Key Infrastructure is the core of Decentralized Identity. The PKI is a set of roles, policies, and procedures, as well as hardware and software to create, manage, distribute, store, and revoke digital certificates. PKI manages public-key encryption. The biggest PKI infrastructure in the world is US Military ID System, which uses public-key cryptography for authorization and access management. Bitcoin brings this type of system to the civilian world, as the biggest deployed civilian Public Key Infrastructure.

A Public Key Infrastructure stands between you and your service providers and handles all requests for identity and access, and includes the:
- Verifiable Credential exchange protocols,
- Identity Overlay Network (ION).

Like with any dentity and Access Management system, these components come together to securely facilitate access to critical information while allowing to verify identity on-chain, without intermediaries.

Before the decentralized Public Key Infrastructure, everyone had to buy or obtain digital certificates from traditional Certificate Authorities (CA). Thanks to Bitcoin, there is no need for centralized CA anymore.

## ION

Identity Overlay Network ([ION](https://identity.foundation/ion/)) on Bitcoin allows you to manage your identity. Thanks to ION you can issue decentralized identifiers, as well as control and revoke them.

ION is decentralized which means that no single entity controls the network, although corporations like Microsoft participate in its development:

> “When we started crunching the numbers, we realized that Bitcoin was the only chain that would probably be too costly to attack.“ — [Daniel Buchner](https://bitcoinmagazine.com/culture/microsofts-ion-is-an-open-source-bet-on-bitcoin) , Microsoft, Principle Architect in Identity Foundation ION Working Group
ION is a purely deterministic protocol, which does not require special tokens, trusted validators, or additional consensus mechanisms. The linear progression of Bitcoin's timechain is all that ION requires to function. Satoshi Nakamoto’s original label for the Bitcoin blockchain was a “[timechain](https://bitcoinmagazine.com/culture/bitcoins-blockchain-is-the-timechain)”.

DID documents fit perfectly into a framework that solves the [chronological oracle problem](https://identity.foundation/sidetree/spec/#introduction). Bitcoin introduced the first-ever solution to this problem with its immutable timestamp and unlocked the ability to create a robust decentralized identifier network. 

ION only cares about documenting encryption keys and routing endpoints. Users create their own DIDs and sign operations from their own private wallet to emit them either directly to the Bitcoin blockchain or to an ION node, which batches many of the encrypted operations into a single Bitcoin block transaction. A single Bitcoin transaction can, in theory, batch millions of ION operations.

ION nodes observe each new block on the Bitcoin blockchain for new ION operations, to stay in sync. There is no need for consensus between ION nodes — it’s purely data-deterministic based on the latest state of the Bitcoin blockchain.

Bitcoin’s Identity Network also includes:
- registries to record and relate identifiers to each other,
- resolvers to convert one type of identifier to another and provide a human-readable format for IDs.

## Trust

Decentralized identity enables trusted interactions between people in all types of transactions. When two parties trust each other, mutually beneficial relationships can be established. A secure conversation is a key layer for trusted commerce. Decentralized identity with its instant verification of credentials, can create unprecedented levels of trust between free market participants. Credentials can be issued to a subject, then presented and endorsed by that subject, enabling an exchange of goods and services as a result.

## Zero-knowledge proofs

In a decentralized identity system, you decide what information is shared with third parties. Zero-knowledge proofs protect your privacy by eliminating the need to reveal sensitive information. [Zero-knowledge proofs](https://en.wikipedia.org/wiki/Zero-knowledge_proof) (also called ZK-proofs) allow the validation of data claims without revealing private information.  Zero-knowledge proofs help prove the authenticity of information without sharing the entire information with a third party.

## Identity Wallet 

As our world becomes increasingly digitized, the same holds true for our assets. From money to credentials, like academic achievements, healthcare cards, or driver’s license, information is manifesting itself as digital tokens, requiring secure and interoperable infrastructure as never before.

Identity wallet software is one of the key components of a decentralized identity and the Web3 cybersecurity ecosystem. Digital identity permeates all facets of society, at the government, corporate, and peer-to-peer levels. Institutions of all kinds will soon face the need to issue, secure, and store emerging classes of digital assets, health, and academic credentials. The digital wallet can become the most important tool ever for taking back control and regaining trust in our digital lives.

An identity wallet protects your identifiers and credentials using encryption and biometrics. The wallet requests consent each time someone attempts to access data associated with your identity and conceals any metadata that could lead to tracking.

**Today’s digital wallets present many problems:**
- Custodial approach  
- Intrusive business models 
- Questionable security 
- Black-box design

### Custodial approach

A custodial design puts the cryptographic keys in the hands of the wallet vendor and thus makes it more difficult to switch between competing products. Non-custodial wallets give users full control and ownership over encryption keys.

### Intrusive business models 

A wallet that is not transparent can collect a stream of valuable data on consumer behavior. That data can then be sold to third parties, on a voluminous data market.

### Questionable security 

Wallet creators work hard to stay ahead of cybercriminals, but working in a vacuum, they sometimes lose the race. Closed software misses constant code audits that the open-source community provides.

### Black-box design 

If you can’t see how a product works, you can’t analyze its internal mechanics and tell whether you can trust it. When an application codebase is closed in a single corporation, the only people who can fix bugs or add features work for that one organization. Even corporate software development teams look tiny, compared to the potential of the global open-source community.


## Open software

With the rise of open source as a framework for mass collaboration at scale, opportunities abound for global decentralized identity development. The benefits have been leveraged across industries, in terms of faster time to market, lower total cost of ownership, and access to innovation beyond the boundaries of a firm.

Open source plays a vital role in democratizing the identity wallet ecosystem. To date, the development of digital wallets has largely been centralized.

## Bitcoin

Bitcoin champions simplicity and stability, and has stood the test of time. Bitcoin operates continuously for 14 years which makes it the most secure and reliable financial network in the world. Influencing or attacking the network is impractical for any potential hackers. Bitcoin stood the test of time in a demanding financial environment and now stands as a solid foundation for the decentralized identity network.

Bitcoin’s low-time preference and principles of self-custody stand in line with the responsibility and ownership that self-sovereign identity requires.

## Veles

The name _Veles_ refers to the [Slavic God](https://en.wikipedia.org/wiki/Veles_(god)) of the underground, magic, and cattle.

## Summary

Veles Lab researches, develops, and promotes best practices for building digital wallets.

Veles ID helps you take back ownership of your identity and regain control over your online data.

Control over your identity and data offers you freedom. Freedom brings power and power carries responsibilities. Veles ID is a non-custodial wallet. Self-custody gives you full control over cryptographic keys and requires responsibilities associated with your new levels of power and freedom.
